import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { restaurantMemberships, restaurants, sessions, users } from "../../../src/db/schema/index.js";
import { Argon2PasswordHasher } from "../../../src/modules/auth/password-hasher.js";
import { hashSessionToken } from "../../../src/modules/auth/session-tokens.js";
import { DrizzleAuthRepository } from "../../../src/modules/auth/repositories/drizzle-auth-repository.js";
import type { GetSessionUseCase } from "../../../src/modules/auth/use-cases/get-session.use-case.js";
import { nextAuthClientAddress } from "../../helpers/auth.js";

type SessionResponse = Awaited<ReturnType<GetSessionUseCase["execute"]>>;

describe("Auth (E2E)", () => {
  const origin = "http://localhost:5173";
  const authHeaders = { origin, "x-auth-request": "1" };
  const credentials = { email: "auth-test@example.com", password: "correct-password" };
  const repository = new DrizzleAuthRepository();
  const fixtureUsers: string[] = [];
  const fixtureRestaurants: string[] = [];
  let userId: string;
  let passwordHash: string;
  let clientAddress: string;

  async function cleanup() {
    if (fixtureUsers.length) await db.delete(users).where(inArray(users.id, fixtureUsers));
    if (fixtureRestaurants.length) await db.delete(restaurants).where(inArray(restaurants.id, fixtureRestaurants));
    fixtureUsers.length = 0;
    fixtureRestaurants.length = 0;
  }

  beforeAll(async () => {
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", origin);
    vi.stubEnv("AUTH_COOKIE_SECURE", "false");
    vi.stubEnv("AUTH_SESSION_TTL_SECONDS", "28800");
    vi.stubEnv("AUTH_SESSION_IDLE_SECONDS", "1800");
    await app.ready();
    passwordHash = await new Argon2PasswordHasher().hash(credentials.password);
  });

  beforeEach(async () => {
    await cleanup();
    clientAddress = nextAuthClientAddress();
    userId = randomUUID();
    fixtureUsers.push(userId);
    await db.insert(users).values({ id: userId, email: credentials.email, passwordHash });
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
    vi.unstubAllEnvs();
  });

  async function login(email = credentials.email, password = credentials.password) {
    return app.inject({ method: "POST", url: "/auth/login", remoteAddress: clientAddress, headers: authHeaders, payload: { email, password } });
  }

  async function authenticate() {
    const response = await login();
    expect(response.statusCode).toBe(200);
    const cookie = response.cookies.find((entry) => entry.name === "massa-session");
    if (!cookie) throw new Error("Expected session cookie");
    return { cookie: cookie.name + "=" + cookie.value, token: cookie.value, response };
  }

  async function getSession(cookie: string) {
    return app.inject({ method: "GET", url: "/auth/session", headers: { cookie } });
  }

  async function storedSession() {
    const [session] = await db.select().from(sessions).where(eq(sessions.userId, userId));
    return session;
  }

  it("logs in with canonical email, secure attributes and hash-only persistence", async () => {
    const response = await login("  AUTH-TEST@EXAMPLE.COM  ");
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ user: { id: userId, email: credentials.email } });
    expect(response.headers["cache-control"]).toBe("no-store");
    const cookie = response.cookies.find((entry) => entry.name === "massa-session");
    expect(cookie).toBeDefined();
    const raw = cookie!.value;
    const serialized = response.headers["set-cookie"];
    expect(serialized).toContain("HttpOnly");
    expect(serialized).toContain("SameSite=Lax");
    expect(serialized).toContain("Path=/");
    expect(serialized).not.toContain("Domain=");
    expect(serialized).not.toContain("Secure");
    const session = await storedSession();
    expect(session.tokenHash).toBe(hashSessionToken(raw));
    expect(JSON.stringify(session)).not.toContain(raw);
    expect(session.userId).toBe(userId);
    expect(session.revokedAt).toBeNull();
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBe(28_800_000);
    expect(session.lastActivityAt).toEqual(session.createdAt);
    expect(session.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.body).not.toContain(session.csrfToken);
    expect(response.body).not.toContain(passwordHash);
  });

  it("returns indistinguishable credentials errors for password, email and inactive user", async () => {
    const wrong = await login(credentials.email, "wrong");
    const missing = await login("unknown@example.com");
    await db.update(users).set({ active: false }).where(eq(users.id, userId));
    const inactive = await login();
    for (const response of [wrong, missing, inactive]) {
      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({
        code: "INVALID_CREDENTIALS", message: "Invalid email or password.",
      });
      expect(response.headers["set-cookie"]).toBeUndefined();
    }
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toEqual([]);
  });

  it("returns minimal session data and [] without memberships; updates activity only", async () => {
    const { cookie } = await authenticate();
    const previous = await storedSession();
    const oldActivity = new Date(Date.now() - 60_000);
    await db.update(sessions).set({ lastActivityAt: oldActivity }).where(eq(sessions.id, previous.id));
    const response = await getSession(cookie);
    expect(response.statusCode).toBe(200);
    expect(response.json<SessionResponse>()).toEqual({
      user: { id: userId, email: credentials.email }, memberships: [], csrfToken: previous.csrfToken,
    });
    const after = await storedSession();
    expect(after.lastActivityAt.getTime()).toBeGreaterThan(oldActivity.getTime());
    expect(after.expiresAt).toEqual(previous.expiresAt);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.body).not.toContain(previous.tokenHash);
    expect(response.body).not.toContain(passwordHash);
  });

  it("reads only active memberships of the authenticated user from PostgreSQL", async () => {
    const otherUserId = randomUUID();
    fixtureUsers.push(otherUserId);
    await db.insert(users).values({ id: otherUserId, email: "other-auth@example.com", passwordHash });
    const restaurantIds = [randomUUID(), randomUUID(), randomUUID()].sort();
    fixtureRestaurants.push(...restaurantIds);
    await db.insert(restaurants).values(restaurantIds.map((id) => ({
      id, name: "Auth fixture", address: "Test", phone: "123", timezone: "UTC",
    })));
    await db.insert(restaurantMemberships).values([
      { userId, restaurantId: restaurantIds[0], role: "OWNER" },
      { userId, restaurantId: restaurantIds[1], role: "STAFF" },
      { userId, restaurantId: restaurantIds[2], role: "OWNER", active: false },
      { userId: otherUserId, restaurantId: restaurantIds[2], role: "OWNER" },
    ]);
    const { cookie } = await authenticate();
    const response = await getSession(cookie);
    expect(response.statusCode).toBe(200);
    expect(response.json<SessionResponse>().memberships).toEqual([
      { restaurantId: restaurantIds[0], role: "OWNER" },
      { restaurantId: restaurantIds[1], role: "STAFF" },
    ]);
    await db.update(restaurantMemberships).set({ active: false }).where(eq(restaurantMemberships.userId, userId));
    expect((await getSession(cookie)).json<SessionResponse>().memberships).toEqual([]);
  });

  it.each(["expired", "idle", "revoked", "inactive"] as const)("rejects %s session without touching activity", async (state) => {
    const { cookie } = await authenticate();
    const session = await storedSession();
    if (state === "expired") await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1) }).where(eq(sessions.id, session.id));
    if (state === "idle") await db.update(sessions).set({ lastActivityAt: new Date(Date.now() - 1_800_001) }).where(eq(sessions.id, session.id));
    if (state === "revoked") await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, session.id));
    if (state === "inactive") await db.update(users).set({ active: false }).where(eq(users.id, userId));
    const before = await storedSession();
    const response = await getSession(cookie);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: "UNAUTHENTICATED", message: "Authentication required." });
    expect((await storedSession()).lastActivityAt).toEqual(before.lastActivityAt);
  });

  it.each(["", "massa-session=bad", "massa-session=" + "x".repeat(43)])("rejects missing/invalid/unknown cookie", async (cookie) => {
    const response = await getSession(cookie);
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ code: "UNAUTHENTICATED", message: "Authentication required." });
  });

  it("logout validates CSRF, revokes, clears cookie and requires a valid session", async () => {
    const { cookie } = await authenticate();
    const sessionResponse = (await getSession(cookie)).json<SessionResponse>();
    const response = await app.inject({
      method: "POST", url: "/auth/logout",
      headers: { ...authHeaders, cookie, "x-csrf-token": sessionResponse.csrfToken },
    });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
    expect((await storedSession()).revokedAt).not.toBeNull();
    expect(response.headers["set-cookie"]).toContain("massa-session=;");
    expect(response.headers["set-cookie"]).toContain("Max-Age=0");
    expect(response.headers["set-cookie"]).toContain("HttpOnly");
    expect(response.headers["set-cookie"]).toContain("Path=/");
    expect((await getSession(cookie)).statusCode).toBe(401);
    const repeated = await app.inject({ method: "POST", url: "/auth/logout", headers: { ...authHeaders, cookie } });
    expect(repeated.statusCode).toBe(401);
    const anonymous = await app.inject({ method: "POST", url: "/auth/logout", headers: authHeaders });
    expect(anonymous.statusCode).toBe(401);
  });

  it.each([undefined, "wrong", "x".repeat(43)])("rejects invalid/missing logout CSRF with no mutation", async (csrf) => {
    const { cookie } = await authenticate();
    const before = await storedSession();
    const response = await app.inject({
      method: "POST", url: "/auth/logout",
      headers: { ...authHeaders, cookie, ...(csrf ? { "x-csrf-token": csrf } : {}) },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ code: "INVALID_CSRF", message: "Invalid CSRF protection." });
    expect(await storedSession()).toEqual(before);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("does not accept another session's CSRF token", async () => {
    const first = await authenticate();
    const second = await authenticate();
    const csrf = (await getSession(first.cookie)).json<SessionResponse>().csrfToken;
    const response = await app.inject({
      method: "POST", url: "/auth/logout", headers: { ...authHeaders, cookie: second.cookie, "x-csrf-token": csrf },
    });
    expect(response.statusCode).toBe(403);
    expect((await getSession(second.cookie)).statusCode).toBe(200);
  });

  it.each([
    { "x-auth-request": "1" },
    { origin },
    { origin: "null", "x-auth-request": "1" },
    { origin: "http://evil.example", "x-auth-request": "1" },
    { origin: origin + ".evil.example", "x-auth-request": "1" },
  ])("blocks login CSRF before persistence", async (headers) => {
    const response = await app.inject({ method: "POST", url: "/auth/login", headers, payload: credentials });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("INVALID_CSRF");
    expect(await db.select().from(sessions).where(eq(sessions.userId, userId))).toEqual([]);
  });

  it("blocks cross-origin logout even with a valid CSRF token", async () => {
    const { cookie } = await authenticate();
    const session = await storedSession();
    const response = await app.inject({
      method: "POST", url: "/auth/logout",
      headers: { ...authHeaders, origin: "http://evil.example", cookie, "x-csrf-token": session.csrfToken },
    });
    expect(response.statusCode).toBe(403);
    expect((await storedSession()).revokedAt).toBeNull();
  });

  it("rejects malformed/oversized login input without exposing credentials", async () => {
    const invalid = await app.inject({
      method: "POST", url: "/auth/login", headers: authHeaders,
      payload: { email: credentials.email, password: "" },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().code).toBe("VALIDATION_ERROR");
    const malformed = await app.inject({
      method: "POST", url: "/auth/login",
      headers: { ...authHeaders, "content-type": "application/json" },
      payload: '{"password":"private-value",',
    });
    expect(malformed.statusCode).toBe(400);
    expect(malformed.body).not.toContain("private-value");
    const large = await app.inject({
      method: "POST", url: "/auth/login", headers: authHeaders,
      payload: { email: credentials.email, password: "p".repeat(9000) },
    });
    expect(large.statusCode).toBe(413);
    expect(large.json().code).toBe("INVALID_AUTH_REQUEST");
  });

  it("never resurrects a session when activity update races with logout", async () => {
    await authenticate();
    const session = await storedSession();
    const now = new Date();
    const cutoff = new Date(now.getTime() - 1_800_000);
    await Promise.all([
      repository.touchSessionIfValid(session.id, now, cutoff),
      repository.revokeSession(session.id, now),
    ]);
    expect((await storedSession()).revokedAt).toEqual(now);
    expect(await repository.touchSessionIfValid(session.id, new Date(), cutoff)).toBe(false);
  });

  it("never moves lastActivityAt backwards on concurrent stale validation", async () => {
    await authenticate();
    const session = await storedSession();
    const futureActivity = new Date(Date.now() + 1000);
    await db.update(sessions).set({ lastActivityAt: futureActivity }).where(eq(sessions.id, session.id));
    expect(await repository.touchSessionIfValid(session.id, new Date(), new Date(Date.now() - 1_800_000))).toBe(true);
    expect((await storedSession()).lastActivityAt).toEqual(futureActivity);
  });
});
