import { describe, expect, it } from "vitest";
import { readAuthConfig } from "./auth-config.js";

describe("Auth configuration", () => {
  it("uses a host-only HttpOnly Lax cookie in local dev", () => {
    const config = readAuthConfig({});
    expect(config.cookieName).toBe("massa-session");
    expect(config.cookieOptions).toEqual({
      path: "/", httpOnly: true, sameSite: "lax", secure: false,
    });
    expect(config.lifetimeMs).toBe(28_800_000);
    expect(config.idleTimeoutMs).toBe(1_800_000);
    expect(config.loginRateLimit).toEqual({ max: 20, timeWindow: 300_000 });
    expect([...config.allowedOrigins]).toEqual([]);
  });

  it("requires secure __Host cookie and explicit HTTPS origins in production", () => {
    const config = readAuthConfig({
      NODE_ENV: "production", AUTH_ALLOWED_ORIGINS: "https://admin.example.com",
    });
    expect(config.cookieName).toBe("__Host-massa-session");
    expect(config.loginRateLimit).toEqual({ max: 20, timeWindow: 300_000 });
    expect(config.cookieOptions).toEqual({
      path: "/", httpOnly: true, sameSite: "lax", secure: true,
    });
    expect(config.cookieOptions).not.toHaveProperty("domain");
    expect([...config.allowedOrigins]).toEqual(["https://admin.example.com"]);
  });

  it("uses only explicitly configured origins, including custom local ports", () => {
    const config = readAuthConfig({
      NODE_ENV: "development",
      AUTH_ALLOWED_ORIGINS: " http://localhost:4321, http://127.0.0.1:8765 ",
    });
    expect([...config.allowedOrigins]).toEqual(["http://localhost:4321", "http://127.0.0.1:8765"]);
    expect(config.allowedOrigins.has("http://localhost:5173")).toBe(false);
  });

  it.each([
    { AUTH_LOGIN_RATE_LIMIT_MAX: "0" },
    { AUTH_LOGIN_RATE_LIMIT_MAX: "101" },
    { AUTH_LOGIN_RATE_LIMIT_MAX: "1.5" },
    { AUTH_LOGIN_RATE_LIMIT_MAX: "NaN" },
    { AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: "0" },
    { AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: "59" },
    { AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: "3601" },
    { NODE_ENV: "production" },
    { NODE_ENV: "production", AUTH_ALLOWED_ORIGINS: "http://admin.example.com" },
    { NODE_ENV: "production", AUTH_ALLOWED_ORIGINS: "https://admin.example.com", AUTH_COOKIE_SECURE: "false" },
    { AUTH_ALLOWED_ORIGINS: "*" },
    { AUTH_ALLOWED_ORIGINS: "null" },
    { AUTH_ALLOWED_ORIGINS: "https://example.com/path" },
    { AUTH_ALLOWED_ORIGINS: "https://example.com/" },
    { AUTH_ALLOWED_ORIGINS: "https://example.com, " },
    { AUTH_ALLOWED_ORIGINS: "" },
    { AUTH_ALLOWED_ORIGINS: "https://*.example.com" },
    { NODE_ENV: "production", AUTH_ALLOWED_ORIGINS: " " },
    { NODE_ENV: "staging" },
    { AUTH_SESSION_TTL_SECONDS: "60", AUTH_SESSION_IDLE_SECONDS: "120" },
    { AUTH_SESSION_IDLE_SECONDS: "0" },
  ])("fails closed for unsafe/invalid configuration %j", (env) => {
    expect(() => readAuthConfig(env)).toThrow();
  });
});
