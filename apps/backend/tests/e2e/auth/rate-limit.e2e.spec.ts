import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { sessions, users } from "../../../src/db/schema/index.js";
import { Argon2PasswordHasher } from "../../../src/modules/auth/password-hasher.js";
import { nextAuthClientAddress } from "../../helpers/auth.js";

describe("Login rate limiting (E2E)", () => {
  const origin = "http://localhost:5173";
  const otherOrigin = "http://localhost:4321";
  const max = 3;
  const windowSeconds = 60;
  const password = "rate-limit-password";
  const expectedLimit = { code: "AUTH_RATE_LIMIT", message: "Too many login attempts. Please try again later." };
  const expectedCredentials = { code: "INVALID_CREDENTIALS", message: "Invalid email or password." };
  let passwordHash: string;
  let userId: string;
  let email: string;
  let clientAddress: string;

  beforeAll(async () => {
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", `${origin},${otherOrigin}`);
    vi.stubEnv("AUTH_LOGIN_RATE_LIMIT_MAX", String(max));
    vi.stubEnv("AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS", String(windowSeconds));
    await app.ready();
    passwordHash = await new Argon2PasswordHasher().hash(password);
  });
  beforeEach(async () => {
    userId = randomUUID();
    email = userId + "@example.com";
    clientAddress = nextAuthClientAddress();
    await db.insert(users).values({ id: userId, email, passwordHash });
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete(users).where(eq(users.id, userId));
  });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  function login(options: { ip?: string; email?: string; password?: string; headers?: Record<string, string> } = {}) {
    return app.inject({
      method: "POST", url: "/auth/login", remoteAddress: options.ip ?? clientAddress,
      headers: { origin, "x-auth-request": "1", ...options.headers },
      payload: { email: options.email ?? email, password: options.password ?? password },
    });
  }

  async function exhaust(ip = clientAddress) {
    for (let attempt = 0; attempt < max; attempt++) {
      expect((await login({ ip, password: "wrong" })).statusCode).toBe(401);
    }
  }

  it("allows attempts up to the configured limit, then returns 429 before password verification or persistence", async () => {
    const verify = vi.spyOn(Argon2PasswordHasher.prototype, "verify");
    for (let attempt = 0; attempt < max - 1; attempt++) {
      const invalid = await login({ password: "wrong" });
      expect(invalid.statusCode).toBe(401);
      expect(invalid.json()).toEqual(expectedCredentials);
    }
    const valid = await login({ email: "  " + email.toUpperCase() + "  " });
    expect(valid.statusCode).toBe(200);
    expect(valid.json()).toEqual({ user: { id: userId, email } });
    expect(valid.headers["x-ratelimit-remaining"]).toBe("0");
    const before = await db.select().from(sessions).where(eq(sessions.userId, userId));
    expect(before).toHaveLength(1);
    verify.mockClear();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocked = await login();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual(expectedLimit);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(Number(blocked.headers["retry-after"])).toBeLessThanOrEqual(windowSeconds);
    expect(blocked.headers["access-control-expose-headers"]).toBe("Retry-After");
    expect(blocked.headers["access-control-allow-origin"]).toBe(origin);
    expect(blocked.headers["cache-control"]).toBe("no-store");
    expect(blocked.headers["set-cookie"]).toBeUndefined();
    expect(blocked.body).not.toContain(email);
    expect(blocked.body).not.toContain(password);
    expect(verify).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toEqual(before);
  });

  it("keeps wrong password, missing email and inactive user errors indistinguishable below the limit", async () => {
    const wrong = await login({ password: "wrong" });
    const missing = await login({ email: "missing-" + email });
    await db.update(users).set({ active: false }).where(eq(users.id, userId));
    const inactive = await login();
    for (const response of [wrong, missing, inactive]) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual(expectedCredentials);
    }
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toEqual([]);
    expect((await login({ email: "another-" + email })).json()).toEqual(expectedLimit);
  });

  it("shares an IP budget across emails but isolates another IP even for the same email", async () => {
    await exhaust();
    const otherEmail = await login({ email: "different-" + email });
    expect(otherEmail.statusCode).toBe(429);
    expect(otherEmail.json()).toEqual(expectedLimit);
    const otherIp = await login({ ip: nextAuthClientAddress() });
    expect(otherIp.statusCode).toBe(200);
    expect(otherIp.json().user.id).toBe(userId);
  });

  it("does not allow forwarded headers, Origin or email spelling to change the network key", async () => {
    await exhaust();
    const blocked = await login({
      email: " " + email.toUpperCase() + " ",
      headers: { origin: otherOrigin, "x-forwarded-for": "203.0.113.90", "x-real-ip": "203.0.113.91" },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toEqual(expectedLimit);
  });

  it("expires the fixed window without extending it for blocked requests or imposing a permanent ban", async () => {
    const start = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(start);
    await exhaust();
    expect((await login()).headers["retry-after"]).toBe(String(windowSeconds));
    clock.mockReturnValue(start + 30_000);
    const blocked = await login();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers["retry-after"]).toBe("30");
    clock.mockReturnValue(start + windowSeconds * 1000);
    const reset = await login();
    expect(reset.statusCode).toBe(200);
    expect(reset.headers["x-ratelimit-remaining"]).toBe(String(max - 1));
    expect(reset.headers["retry-after"]).toBeUndefined();
  });

  it("accepts a concurrent burst that stays within the budget", async () => {
    const responses = await Promise.all(Array.from({ length: max }, () => login()));
    for (const response of responses) expect(response.statusCode).toBe(200);
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toHaveLength(max);
  });

  it("never exceeds the budget for an oversized concurrent burst", async () => {
    const responses = await Promise.all(Array.from({ length: max + 2 }, () => login()));
    // The plugin's local store can conservatively reject the whole overlapping burst.
    const accepted = responses.filter((response) => response.statusCode === 200);
    expect(accepted.length).toBeLessThanOrEqual(max);
    const blocked = responses.filter((response) => response.statusCode === 429);
    expect(blocked.length).toBeGreaterThanOrEqual(2);
    expect(accepted.length + blocked.length).toBe(responses.length);
    for (const response of blocked) expect(response.json()).toEqual(expectedLimit);
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toHaveLength(accepted.length);
  });

  it("does not rate limit session lookup or protected logout after login exhaustion", async () => {
    const valid = await login();
    expect(valid.statusCode).toBe(200);
    const sessionCookie = valid.cookies.find((entry) => entry.name === "massa-session");
    if (!sessionCookie) throw new Error("Session cookie missing");
    const headers = { origin, "x-auth-request": "1", cookie: sessionCookie.name + "=" + sessionCookie.value };
    for (let attempt = 1; attempt < max; attempt++) expect((await login({ password: "wrong" })).statusCode).toBe(401);
    expect((await login()).statusCode).toBe(429);
    let csrfToken = "";
    for (let attempt = 0; attempt <= max; attempt++) {
      const session = await app.inject({ method: "GET", url: "/auth/session", remoteAddress: clientAddress, headers });
      expect(session.statusCode).toBe(200);
      expect(session.headers["x-ratelimit-limit"]).toBeUndefined();
      csrfToken = session.json<{ csrfToken: string }>().csrfToken;
    }
    const invalid = await app.inject({ method: "POST", url: "/auth/logout", remoteAddress: clientAddress, headers });
    expect(invalid.statusCode).toBe(403);
    expect(invalid.json().code).toBe("INVALID_CSRF");
    const logout = await app.inject({
      method: "POST", url: "/auth/logout", remoteAddress: clientAddress, headers: { ...headers, "x-csrf-token": csrfToken },
    });
    expect(logout.statusCode).toBe(204);
    expect(logout.headers["retry-after"]).toBeUndefined();
  });

  it("does not consume login budget on OPTIONS or bypass CSRF with rate limit allowance", async () => {
    for (let attempt = 0; attempt <= max; attempt++) {
      const preflight = await app.inject({
        method: "OPTIONS", url: "/auth/login", remoteAddress: clientAddress,
        headers: { origin, "access-control-request-method": "POST" },
      });
      expect(preflight.statusCode).toBe(204);
      expect(preflight.headers["x-ratelimit-limit"]).toBeUndefined();
    }
    const csrf = await login({ headers: { origin: "https://evil.example" } });
    expect(csrf.statusCode).toBe(403);
    expect(csrf.json().code).toBe("INVALID_CSRF");
    const valid = await login();
    expect(valid.statusCode).toBe(200);
    expect(valid.headers["x-ratelimit-remaining"]).toBe(String(max - 1));
  });

  it("counts malformed login bodies before reaching the controller", async () => {
    for (let attempt = 0; attempt < max; attempt++) {
      const malformed = await app.inject({
        method: "POST", url: "/auth/login", remoteAddress: clientAddress,
        headers: { origin, "x-auth-request": "1", "content-type": "application/json" }, payload: "{",
      });
      expect(malformed.statusCode).toBe(400);
    }
    expect((await login()).statusCode).toBe(429);
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toEqual([]);
  });
});
