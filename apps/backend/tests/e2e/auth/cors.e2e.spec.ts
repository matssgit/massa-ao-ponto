import { randomUUID } from "node:crypto";
import cookie from "@fastify/cookie";
import fastify from "fastify";
import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { restaurants, sessions, users } from "../../../src/db/schema/index.js";
import { registerCors } from "../../../src/http/cors.js";
import { errorHandler } from "../../../src/http/error-handler.js";
import { readAuthConfig } from "../../../src/modules/auth/auth-config.js";
import { registerAuthorization } from "../../../src/modules/auth/authorization.js";
import { Argon2PasswordHasher } from "../../../src/modules/auth/password-hasher.js";
import { authRoutes } from "../../../src/modules/auth/routes.js";
import { useTestAuth } from "../../helpers/auth.js";

describe("Browser security integration (E2E)", () => {
  const auth = useTestAuth(app);
  const origins = ["http://localhost:4321", "http://127.0.0.1:8765"];
  let restaurantId: string;

  beforeAll(async () => {
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", origins.join(","));
    await app.ready();
  });
  beforeEach(async () => { restaurantId = (await auth.createRestaurant()).id; });
  afterEach(async () => { await db.delete(restaurants).where(eq(restaurants.id, restaurantId)); });
  afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

  it.each(origins)("allows exactly configured origin %s with credentials and cookie", async (origin) => {
    const response = await app.inject({
      method: "GET", url: "/auth/session", headers: { cookie: auth.headers.cookie, origin },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().user.id).toBe(auth.userId);
    expect(response.headers["access-control-allow-origin"]).toBe(origin);
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
    expect(response.headers.vary).toContain("Origin");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["access-control-expose-headers"]).toBe("Retry-After");
  });

  it.each(["http://localhost:5173", "http://localhost:43210", "http://localhost:4321.evil.example", "null"])(
    "does not grant browser access to unlisted origin %s", async (origin) => {
      const response = await app.inject({
        method: "GET", url: "/auth/session", headers: { cookie: auth.headers.cookie, origin },
      });
      // CORS controls browser visibility; the valid session still follows normal authentication.
      expect(response.statusCode).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBeUndefined();
      expect(response.headers.vary).toContain("Origin");
    },
  );

  it("does not infer a trusted Origin from Host or forwarded headers", async () => {
    const response = await app.inject({
      method: "GET", url: "/auth/session",
      headers: { cookie: auth.headers.cookie, host: "localhost:4321", "x-forwarded-host": "localhost:4321" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it.each(["/auth/login", "/auth/logout", "/restaurants", "/restaurants/invalid-id/orders"])(
    "answers preflight on %s without session, CSRF or persistence", async (url) => {
      const before = await db.select().from(sessions).where(eq(sessions.userId, auth.userId));
      const response = await app.inject({
        method: "OPTIONS", url,
        headers: {
          origin: origins[0], "access-control-request-method": "POST",
          "access-control-request-headers": "content-type,x-auth-request,x-csrf-token",
        },
      });
      expect(response.statusCode).toBe(204);
      expect(response.body).toBe("");
      expect(response.headers["access-control-allow-origin"]).toBe(origins[0]);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
      expect(response.headers["access-control-allow-methods"]).toBe("GET, HEAD, POST, PATCH, DELETE, OPTIONS");
      expect(response.headers["access-control-allow-headers"]).toBe("Content-Type, X-Auth-Request, X-CSRF-Token");
      expect(response.headers["set-cookie"]).toBeUndefined();
      expect(await db.select().from(sessions).where(eq(sessions.userId, auth.userId))).toEqual(before);
    },
  );

  it("does not reflect unapproved preflight origins, headers or methods", async () => {
    const response = await app.inject({
      method: "OPTIONS", url: "/auth/logout",
      headers: {
        origin: "https://evil.example", "access-control-request-method": "PUT",
        "access-control-request-headers": "x-untrusted-header",
      },
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.headers["access-control-allow-methods"]).not.toContain("PUT");
    expect(response.headers["access-control-allow-headers"]).not.toContain("x-untrusted-header");
  });

  it.each([{ origin: origins[0] }, { "access-control-request-method": "POST" }])(
    "rejects malformed preflight without asking for authentication", async (headers) => {
      const response = await app.inject({ method: "OPTIONS", url: "/auth/logout", headers });
      expect(response.statusCode).toBe(400);
      expect(response.headers["set-cookie"]).toBeUndefined();
    },
  );

  it("CORS permission does not bypass auth or disabled provisioning", async () => {
    const anonymous = await app.inject({ method: "GET", url: "/restaurants", headers: { origin: origins[0] } });
    expect(anonymous.statusCode).toBe(401);
    expect(anonymous.json().code).toBe("UNAUTHENTICATED");
    expect(anonymous.headers["access-control-allow-origin"]).toBe(origins[0]);
    const creation = await app.inject({ method: "POST", url: "/restaurants", headers: auth.headers, payload: {} });
    expect(creation.statusCode).toBe(403);
    expect(creation.json().code).toBe("FORBIDDEN");
  });

  it("GET preserves business state and only performs existing session activity bookkeeping", async () => {
    const before = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    const response = await app.inject({
      method: "GET", url: `/restaurants/${restaurantId}`, headers: { cookie: auth.headers.cookie, origin: origins[0] },
    });
    expect(response.statusCode).toBe(200);
    expect(await db.select().from(restaurants).where(eq(restaurants.id, restaurantId))).toEqual(before);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it.each(["missing", "invalid", "origin"] as const)("rejects %s CSRF without business or session mutation", async (kind) => {
    const headers = { ...auth.headers };
    if (kind === "missing") delete headers["x-csrf-token"];
    if (kind === "invalid") headers["x-csrf-token"] = "wrong";
    if (kind === "origin") headers.origin = "https://evil.example";
    const before = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    const sessionBefore = await db.select().from(sessions).where(eq(sessions.userId, auth.userId));
    const response = await app.inject({
      method: "PATCH", url: `/restaurants/${restaurantId}`, headers, payload: { name: "Forbidden change" },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json().code).toBe("INVALID_CSRF");
    expect(await db.select().from(restaurants).where(eq(restaurants.id, restaurantId))).toEqual(before);
    expect(await db.select().from(sessions).where(eq(sessions.userId, auth.userId))).toEqual(sessionBefore);
  });

  it("accepts CSRF with credentials for mutations and protected logout", async () => {
    const response = await app.inject({
      method: "PATCH", url: `/restaurants/${restaurantId}`, headers: auth.headers, payload: { name: "Updated" },
    });
    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(origins[0]);
    const [stored] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId));
    expect(stored.name).toBe("Updated");
    const logout = await app.inject({ method: "POST", url: "/auth/logout", headers: auth.headers });
    expect(logout.statusCode).toBe(204);
    expect(logout.headers["access-control-allow-credentials"]).toBe("true");
    expect(logout.headers["set-cookie"]).toContain("massa-session=;");
    expect(logout.headers["set-cookie"]).not.toContain("Secure");
  });
});

it("uses production cookie attributes on real login and logout with HTTPS CORS", async () => {
  const productionApp = fastify();
  const userId = randomUUID();
  const origin = "https://admin.example.com";
  const credentials = { email: userId + "@example.com", password: "production-cookie-test" };
  try {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", origin);
    vi.stubEnv("AUTH_COOKIE_SECURE", "true");
    productionApp.setErrorHandler(errorHandler);
    await registerCors(productionApp, readAuthConfig());
    await productionApp.register(cookie);
    registerAuthorization(productionApp);
    productionApp.register(authRoutes);
    await productionApp.ready();
    await db.insert(users).values({
      id: userId, email: credentials.email, passwordHash: await new Argon2PasswordHasher().hash(credentials.password),
    });
    const login = await productionApp.inject({
      method: "POST", url: "/auth/login", headers: { origin, "x-auth-request": "1" }, payload: credentials,
    });
    expect(login.statusCode).toBe(200);
    const sessionCookie = login.cookies.find((entry) => entry.name === "__Host-massa-session");
    if (!sessionCookie) throw new Error("Missing production session cookie");
    const headers = { origin, cookie: sessionCookie.name + "=" + sessionCookie.value, "x-auth-request": "1" };
    const session = await productionApp.inject({ method: "GET", url: "/auth/session", headers });
    expect(session.statusCode).toBe(200);
    const logout = await productionApp.inject({
      method: "POST", url: "/auth/logout", headers: { ...headers, "x-csrf-token": session.json<{ csrfToken: string }>().csrfToken },
    });
    expect(logout.statusCode).toBe(204);
    for (const response of [login, logout]) {
      expect(response.headers["access-control-allow-origin"]).toBe(origin);
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
      expect(response.headers["set-cookie"]).toContain("__Host-massa-session=");
      expect(response.headers["set-cookie"]).toContain("HttpOnly");
      expect(response.headers["set-cookie"]).toContain("Secure");
      expect(response.headers["set-cookie"]).toContain("SameSite=Lax");
      expect(response.headers["set-cookie"]).toContain("Path=/");
      expect(response.headers["set-cookie"]).not.toContain("Domain=");
    }
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");
  } finally {
    await db.delete(users).where(eq(users.id, userId));
    await productionApp.close();
    vi.unstubAllEnvs();
  }
});
