import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../lib/api-client";
import { AuthService, type Session } from "../features/auth/auth-service";
import { AuthProvider } from "../features/auth/auth-context";
import { useAuth } from "../features/auth/auth-state";
import { App } from "./app";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const session: Session = {
  user: {
    id: "33333333-3333-4333-8333-333333333333",
    email: "owner@example.com",
  },
  memberships: [{ restaurantId: first, role: "OWNER" }],
  csrfToken: "test-csrf",
};
const unauthorized = () =>
  Response.json(
    { code: "UNAUTHENTICATED", message: "Unauthenticated" },
    { status: 401 },
  );

function fixture(initial: Session | null = session) {
  let active = initial;
  const transport = vi.fn<typeof fetch>(async (url) => {
    const path = new URL(String(url)).pathname;
    if (path === "/auth/session")
      return active ? Response.json(active) : unauthorized();
    if (path === "/auth/login") {
      active = session;
      return Response.json({ user: session.user });
    }
    if (path === "/auth/logout") {
      active = null;
      return new Response(null, { status: 204 });
    }
    if (path.endsWith("/dashboard/sales-summary")) return Response.json({
      period: { startsAt: null, endsAt: null },
      orders: { total: 0, paid: 0, pending: 0, delivered: 0, cancelled: 0 },
      revenue: 0, averageTicket: 0,
    });
    if (path.includes("/dashboard/")) return Response.json([]);
    if (path.endsWith("/orders")) return Response.json({
      data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
    });
    if (path.endsWith("/reservations")) return Response.json({
      data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
    });
    if (path.endsWith("/customers")) return Response.json({
      data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrevious: false },
    });
    if (path.endsWith("/products") || path.endsWith("/product-categories") || path.endsWith("/addons")) return Response.json([]);
    if (path.endsWith("/tables")) return Response.json([]);
    if (path === "/restaurants")
      return Response.json([
        { id: first, name: "Casa Centro" },
        { id: second, name: "Casa Norte" },
      ]);
    return unauthorized();
  });
  const service = new AuthService(
    new ApiClient("https://api.example.com", transport),
  );
  return { service, transport };
}

function mount(service: AuthService, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App service={service} />
    </MemoryRouter>,
  );
}

describe("Frontend auth and protected shell", () => {
  it("shows bootstrap loading before revealing protected content", async () => {
    const { service } = fixture();
    mount(service, "/pedidos");
    expect(screen.getByRole("status").textContent).toContain("Verificando");
    expect(screen.queryByRole("heading", { name: "Pedidos" })).toBeNull();
    expect(
      await screen.findByRole("heading", { name: "Pedidos" }),
    ).toBeTruthy();
  });

  it("redirects anonymous protected routes to login", async () => {
    const { service } = fixture(null);
    mount(service, "/reservas");
    expect(
      await screen.findByRole("heading", { name: "Entre na sua conta" }),
    ).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("logs in then loads the session, sends credentials and logs out with CSRF", async () => {
    const { service, transport } = fixture(null);
    const storage = vi.spyOn(Storage.prototype, "setItem");
    const user = userEvent.setup();
    mount(service);
    await screen.findByRole("heading", { name: "Entre na sua conta" });
    await user.type(screen.getByLabelText("E-mail"), "owner@example.com");
    await user.type(screen.getByLabelText("Senha"), "test-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    await screen.findByRole("heading", { name: "Visão geral" });
    const loginIndex = transport.mock.calls.findIndex(([url]) =>
      String(url).endsWith("/auth/login"),
    );
    expect(String(transport.mock.calls[loginIndex + 1][0])).toMatch(
      /\/auth\/session$/,
    );
    expect(transport.mock.calls[loginIndex][1]).toMatchObject({
      credentials: "include",
      body: JSON.stringify({
        email: "owner@example.com",
        password: "test-password",
      }),
    });
    await user.click(screen.getByRole("button", { name: "Sair" }));
    await screen.findByRole("heading", { name: "Entre na sua conta" });
    const logout = transport.mock.calls.find(([url]) =>
      String(url).endsWith("/auth/logout"),
    );
    expect(new Headers(logout?.[1]?.headers).get("X-CSRF-Token")).toBe(
      session.csrfToken,
    );
    expect(new Headers(logout?.[1]?.headers).get("X-Auth-Request")).toBe("1");
    expect(storage).not.toHaveBeenCalled();
    storage.mockRestore();
  });

  it("uses the same friendly login error regardless of a server credential message", async () => {
    const { service, transport } = fixture(null);
    const user = userEvent.setup();
    mount(service);
    await screen.findByLabelText("E-mail");
    transport.mockResolvedValueOnce(
      Response.json(
        { code: "INVALID_CREDENTIALS", message: "Invalid credentials" },
        { status: 401 },
      ),
    );
    await user.type(screen.getByLabelText("E-mail"), "unknown@example.com");
    await user.type(screen.getByLabelText("Senha"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "E-mail ou senha inválidos.",
    );
    expect((screen.getByLabelText("Senha") as HTMLInputElement).value).toBe("");
  });

  it("offers a retry on network failure without treating it as an anonymous session", async () => {
    const { service, transport } = fixture();
    transport.mockRejectedValueOnce(new TypeError("network failure"));
    mount(service);
    expect(
      await screen.findByRole("heading", {
        name: "Não conseguimos verificar sua sessão.",
      }),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Senha")).toBeNull();
    await userEvent.click(
      screen.getByRole("button", { name: "Tentar novamente" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Visão geral" }),
    ).toBeTruthy();
  });

  it("automatically selects the single authorized restaurant", async () => {
    const { service } = fixture();
    mount(service);
    await screen.findByRole("heading", { name: "Visão geral" });
    expect((screen.getByRole("combobox", { name: "RESTAURANTE" }) as HTMLSelectElement).value).toBe(
      first,
    );
    expect(
      await screen.findByRole("option", { name: "Casa Centro" }),
    ).toBeTruthy();
    expect(screen.queryByRole("option", { name: "Casa Norte" })).toBeNull();
  });

  it("requires explicit selection with multiple memberships and recalculates role on switching", async () => {
    const { service } = fixture({
      ...session,
      memberships: [
        session.memberships[0],
        { restaurantId: second, role: "STAFF" },
      ],
    });
    mount(service);
    await screen.findByRole("heading", { name: "Qual casa vamos acompanhar?" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "RESTAURANTE" }), first);
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Relatórios/ })).toBeNull();
    await userEvent.click(screen.getByRole("link", { name: /Cardápio/ }));
    await screen.findByRole("heading", { name: "Cardápio" });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "RESTAURANTE" }), second);
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Cardápio/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Relatórios/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /Configurações/ })).toBeNull();
  });

  it("blocks direct OWNER-only URLs for STAFF while keeping operational navigation", async () => {
    const { service } = fixture({
      ...session,
      memberships: [{ restaurantId: first, role: "STAFF" }],
    });
    mount(service, "/configuracoes");
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Configurações/ })).toBeNull();
    await userEvent.click(screen.getByRole("link", { name: /Pedidos/ }));
    expect(
      await screen.findByRole("heading", { name: "Pedidos" }),
    ).toBeTruthy();
  });

  it("handles users without memberships without inventing tenant access", async () => {
    const { service } = fixture({ ...session, memberships: [] });
    mount(service);
    await screen.findByRole("heading", { name: "Seu acesso está pronto." });
    expect((screen.getByRole("combobox", { name: "RESTAURANTE" }) as HTMLSelectElement).disabled).toBe(
      true,
    );
    expect(screen.queryByRole("heading", { name: "Visão geral" })).toBeNull();
    expect(screen.getByRole("button", { name: "Sair" })).toBeTruthy();
  });

  it("clears the session on subsequent protected API 401", async () => {
    const { service } = fixture();
    mount(service);
    await screen.findByRole("heading", { name: "Visão geral" });
    await act(async () => {
      await service.client.request("/expired").catch(() => undefined);
    });
    expect(
      await screen.findByRole("heading", { name: "Entre na sua conta" }),
    ).toBeTruthy();
    await expect(service.logout()).rejects.toMatchObject({
      code: "MISSING_CSRF",
    });
  });

  it("keeps local auth on logout failure and offers session recovery", async () => {
    const { service, transport } = fixture();
    mount(service);
    await screen.findByRole("option", { name: "Casa Centro" });
    transport.mockResolvedValueOnce(
      Response.json(
        { code: "INVALID_CSRF", message: "Invalid CSRF" },
        { status: 403 },
      ),
    );
    await userEvent.click(screen.getByRole("button", { name: "Sair" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Visão geral" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Atualizar sessão" }),
    ).toBeTruthy();
  });

  it("rejects malformed membership contracts instead of authorizing arbitrary roles", async () => {
    const { service, transport } = fixture();
    transport.mockResolvedValueOnce(
      Response.json({
        ...session,
        memberships: [{ restaurantId: first, role: "ADMIN" }],
      }),
    );
    mount(service);
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("does not restore a session from a response that arrives after logout", async () => {
    const { service } = fixture();
    let resolve: (value: Session) => void = () => {
      throw new Error("Refresh not started");
    };
    function Probe() {
      const auth = useAuth();
      return (
        <>
          <p>{auth.authenticated ? "Authenticated" : "Anonymous"}</p>
          <button onClick={() => void auth.refresh()}>Refresh</button>
          <button onClick={() => void auth.logout()}>Logout</button>
        </>
      );
    }
    render(
      <AuthProvider service={service}>
        <Probe />
      </AuthProvider>,
    );
    await screen.findByText("Authenticated");
    vi.spyOn(service, "session").mockImplementationOnce(
      () =>
        new Promise<Session>((done) => {
          resolve = done;
        }),
    );
    fireEvent.click(screen.getByText("Refresh"));
    await userEvent.click(screen.getByText("Logout"));
    await screen.findByText("Anonymous");
    await act(async () => {
      resolve(session);
    });
    await waitFor(() => expect(screen.queryByText("Authenticated")).toBeNull());
  });
});
