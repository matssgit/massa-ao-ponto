import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach } from "vitest";
import { db } from "../../src/db/index.js";
import { restaurantMemberships, restaurants, users } from "../../src/db/schema/index.js";
import { readAuthConfig } from "../../src/modules/auth/auth-config.js";
import { Argon2PasswordHasher } from "../../src/modules/auth/password-hasher.js";
import type { GetSessionUseCase } from "../../src/modules/auth/use-cases/get-session.use-case.js";

const password = "e2e-auth-password";
let passwordHash: Promise<string> | undefined;
let nextClient = 0;

export function nextAuthClientAddress(): string {
  const client = nextClient++;
  return `198.18.${Math.floor(client / 254)}.${client % 254 + 1}`;
}

export class TestAuth {
  userId = "";
  token = "";
  headers: Record<string, string> = {};

  constructor(private readonly app: FastifyInstance) {}

  async login(): Promise<void> {
    const config = readAuthConfig();
    const origin = [...config.allowedOrigins][0];
    this.userId = randomUUID();
    const email = this.userId + "@e2e.example";
    passwordHash ??= new Argon2PasswordHasher().hash(password);
    await db.insert(users).values({ id: this.userId, email, passwordHash: await passwordHash });
    const login = await this.app.inject({
      method: "POST", url: "/auth/login",
      remoteAddress: nextAuthClientAddress(),
      headers: { origin, "x-auth-request": "1" }, payload: { email, password },
    });
    if (login.statusCode !== 200) throw new Error("E2E login failed: " + login.statusCode);
    const cookie = login.cookies.find((entry) => entry.name === config.cookieName);
    if (!cookie) throw new Error("E2E session cookie missing");
    this.token = cookie.value;
    const cookieHeader = cookie.name + "=" + cookie.value;
    const response = await this.app.inject({
      method: "GET", url: "/auth/session", headers: { cookie: cookieHeader },
    });
    if (response.statusCode !== 200) throw new Error("E2E session validation failed");
    const session = response.json<Awaited<ReturnType<GetSessionUseCase["execute"]>>>();
    this.headers = {
      cookie: cookieHeader, origin, "x-auth-request": "1", "x-csrf-token": session.csrfToken,
    };
  }

  async grant(restaurantId: string, role: "OWNER" | "STAFF" = "OWNER", active = true) {
    await db.insert(restaurantMemberships).values({ userId: this.userId, restaurantId, role, active })
      .onConflictDoUpdate({
        target: [restaurantMemberships.userId, restaurantMemberships.restaurantId],
        set: { role, active },
      });
  }

  async createRestaurant(data: typeof restaurants.$inferInsert = {
    name: "Auth fixture", address: "Test", phone: "123", timezone: "UTC",
  }) {
    const [restaurant] = await db.insert(restaurants).values(data).returning();
    await this.grant(restaurant.id);
    return restaurant;
  }

  async cleanup() {
    if (this.userId) await db.delete(users).where(eq(users.id, this.userId));
    this.headers = {};
    this.userId = "";
  }
}

// Fixtures grant membership explicitly; requests always cross the real auth/tenant hooks.
export function useTestAuth(app: FastifyInstance): TestAuth {
  const auth = new TestAuth(app);
  beforeEach(async () => { await auth.login(); });
  afterEach(async () => { await auth.cleanup(); });
  return auth;
}
