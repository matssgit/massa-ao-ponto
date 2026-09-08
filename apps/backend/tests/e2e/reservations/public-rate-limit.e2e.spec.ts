import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { app } from "../../../src/server.js";
import { createPublicReservationToken } from "../../../src/modules/reservations/public-reservation-tokens.js";
import { nextAuthClientAddress } from "../../helpers/auth.js";

const headers = { origin: "http://localhost:5173", "x-auth-request": "1" };
beforeAll(async () => {
  for (const key of ["PUBLIC_AVAILABILITY_RATE_LIMIT_MAX", "PUBLIC_RESERVATION_CREATE_RATE_LIMIT_MAX", "PUBLIC_RESERVATION_ACCESS_RATE_LIMIT_MAX", "AUTH_LOGIN_RATE_LIMIT_MAX"]) vi.stubEnv(key, "2");
  await app.ready();
});
afterAll(async () => { await app.close(); vi.unstubAllEnvs(); });

describe("Public rate limiting", () => {
  it.each(["availability", "create", "lookup", "cancel"])("limits %s by IP across changing identifiers", async kind => {
    const remoteAddress = nextAuthClientAddress();
    const request = () => {
      const token = createPublicReservationToken();
      const slug = "absent-" + token.toLowerCase().replace(/_/g, "a");
      if (kind === "availability") return app.inject({ remoteAddress, url: `/public/restaurants/${slug}/reservations/availability?startsAt=2030-01-01&endsAt=2030-01-02` });
      if (kind === "create") return app.inject({ remoteAddress, method: "POST", url: `/public/restaurants/${slug}/reservations`, headers, payload: {} });
      return app.inject({ remoteAddress, method: kind === "cancel" ? "POST" : "GET", url: `/public/reservations/${token}${kind === "cancel" ? "/cancel" : ""}`, headers });
    };
    expect((await request()).statusCode).not.toBe(429);
    expect((await request()).statusCode).not.toBe(429);
    const blocked = await request();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().code).toBe("PUBLIC_RATE_LIMIT");
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    const other = await app.inject({ url: `/public/reservations/${createPublicReservationToken()}`, remoteAddress: nextAuthClientAddress() });
    expect(other.statusCode).toBe(404);
  });

  it("keeps public counters independent from login and administrative/session reads", async () => {
    const remoteAddress = nextAuthClientAddress();
    for (let i = 0; i < 3; i++) await app.inject({ url: `/public/reservations/${createPublicReservationToken()}`, remoteAddress });
    const login = () => app.inject({ method: "POST", url: "/auth/login", headers, remoteAddress, payload: { email: "absent@example.test", password: "invalid-password" } });
    expect((await login()).statusCode).toBe(401);
    expect((await login()).statusCode).toBe(401);
    const blocked = await login();
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json().code).toBe("AUTH_RATE_LIMIT");
    expect((await app.inject({ url: "/public/restaurants/absent", remoteAddress })).statusCode).toBe(404);
    expect((await app.inject({ url: "/auth/session", remoteAddress })).statusCode).toBe(401);
    expect((await app.inject({ url: "/restaurants", remoteAddress })).statusCode).toBe(401);
  });
});
