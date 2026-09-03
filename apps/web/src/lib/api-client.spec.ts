import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, validateApiUrl } from "./api-client";

describe("ApiClient", () => {
  it("uses the configured URL and cookie credentials without Origin spoofing or GET CSRF", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ok: true }));
    const client = new ApiClient("https://api.example.com/v1/", transport);
    client.setCsrfToken("csrf-test");
    expect(await client.request("/orders?page=2")).toEqual({ ok: true });
    const [url, init] = transport.mock.calls[0];
    expect(url).toBe("https://api.example.com/v1/orders?page=2");
    expect(init).toMatchObject({
      method: "GET",
      credentials: "include",
      cache: "no-store",
      redirect: "error",
    });
    const headers = new Headers(init?.headers);
    expect(headers.has("Origin")).toBe(false);
    expect(headers.has("X-CSRF-Token")).toBe(false);
  });

  it("requires CSRF for mutations and sends it only in a header", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 204 }));
    const client = new ApiClient("https://api.example.com", transport);
    await expect(
      client.request("/auth/logout", { method: "POST" }),
    ).rejects.toMatchObject({ code: "MISSING_CSRF" });
    expect(transport).not.toHaveBeenCalled();
    client.setCsrfToken("csrf-test");
    expect(
      await client.request("/auth/logout", { method: "POST" }),
    ).toBeUndefined();
    const headers = new Headers(transport.mock.calls[0][1]?.headers);
    expect(headers.get("X-Auth-Request")).toBe("1");
    expect(headers.get("X-CSRF-Token")).toBe("csrf-test");
    expect(transport.mock.calls[0][1]?.body).toBeUndefined();
  });

  it("preserves code, message and issues from API failures", async () => {
    const issues = [
      { path: ["email"], message: "Invalid email", code: "invalid_format" },
    ];
    const client = new ApiClient(
      "https://api.example.com",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          Response.json(
            { code: "VALIDATION_ERROR", message: "Validation error.", issues },
            { status: 400 },
          ),
        ),
    );
    await expect(client.request("/test")).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Validation error.",
      issues,
    });
  });

  it("notifies on session 401 but not invalid login credentials", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockImplementation(async () =>
        Response.json(
          { code: "UNAUTHENTICATED", message: "Unauthorized" },
          { status: 401 },
        ),
      );
    const client = new ApiClient("https://api.example.com", transport);
    const listener = vi.fn();
    const unsubscribe = client.onUnauthorized(listener);
    await expect(
      client.request("/auth/login", {
        method: "POST",
        csrf: false,
        body: { email: "user@example.com", password: "test" },
      }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(listener).not.toHaveBeenCalled();
    expect(
      new Headers(transport.mock.calls[0][1]?.headers).get("X-Auth-Request"),
    ).toBe("1");
    expect(
      new Headers(transport.mock.calls[0][1]?.headers).has("X-CSRF-Token"),
    ).toBe(false);
    await expect(client.request("/auth/session")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await expect(client.request("/auth/session")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignores an old request's 401 after a new session was installed", async () => {
    let resolve: (response: Response) => void = () => {
      throw new Error("Request not started");
    };
    const client = new ApiClient(
      "https://api.example.com",
      () =>
        new Promise<Response>((done) => {
          resolve = done;
        }),
    );
    const listener = vi.fn();
    client.onUnauthorized(listener);
    client.setCsrfToken("old");
    const request = client.request("/test");
    client.setCsrfToken("new");
    resolve(
      Response.json(
        { code: "UNAUTHENTICATED", message: "Expired" },
        { status: 401 },
      ),
    );
    await expect(request).rejects.toBeInstanceOf(ApiError);
    expect(listener).not.toHaveBeenCalled();
  });

  it("normalizes network and non-JSON failures", async () => {
    const transport = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("upstream error", { status: 502 }))
      .mockResolvedValueOnce(new Response("not JSON", { status: 200 }));
    const client = new ApiClient("https://api.example.com", transport);
    await expect(client.request("/test")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
    });
    await expect(client.request("/test")).rejects.toMatchObject({
      code: "HTTP_ERROR",
      status: 502,
    });
    await expect(client.request("/test")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it.each([
    undefined,
    "",
    "file:///tmp",
    "https://user:secret@example.com",
    "https://example.com?token=x",
    "https://example.com#x",
  ])("rejects unsafe/missing API config (%s)", (value) => {
    expect(() => validateApiUrl(value)).toThrow("Configure VITE_API_URL");
  });

  it.each([
    "https://other.example.com",
    "//other.example.com",
    "/\\other.example.com",
  ])("rejects arbitrary request destinations (%s)", async (path) => {
    const transport = vi.fn<typeof fetch>();
    await expect(
      new ApiClient("https://api.example.com", transport).request(path),
    ).rejects.toThrow("caminhos relativos");
    expect(transport).not.toHaveBeenCalled();
  });
});
