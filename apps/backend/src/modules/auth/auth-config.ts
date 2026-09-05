import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_ALLOWED_ORIGINS: z.string().optional(),
  AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
  AUTH_SESSION_TTL_SECONDS: z.coerce.number().int().min(60).max(604800).default(28800),
  AUTH_SESSION_IDLE_SECONDS: z.coerce.number().int().min(60).max(604800).default(1800),
  AUTH_LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(20),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
  AUTH_MEMBER_INVITATION_TTL_SECONDS: z.coerce.number().int().min(300).max(2592000).default(604800),
  PUBLIC_AVAILABILITY_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(1000).default(120),
  PUBLIC_AVAILABILITY_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(3600).default(60),
  PUBLIC_RESERVATION_CREATE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(10),
  PUBLIC_RESERVATION_CREATE_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  PUBLIC_RESERVATION_ACCESS_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(500).default(60),
  PUBLIC_RESERVATION_ACCESS_RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().min(60).max(3600).default(300),
});

export function readAuthConfig(environment: NodeJS.ProcessEnv = process.env) {
  const env = environmentSchema.parse(environment);
  const production = env.NODE_ENV === "production";
  const secure = env.AUTH_COOKIE_SECURE === "true" || production;
  if (production && env.AUTH_COOKIE_SECURE === "false") {
    throw new Error("Secure auth cookies are required in production.");
  }
  if (production && !env.AUTH_ALLOWED_ORIGINS) {
    throw new Error("AUTH_ALLOWED_ORIGINS is required in production.");
  }
  const origins = env.AUTH_ALLOWED_ORIGINS === undefined
    ? []
    : env.AUTH_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim());
  for (const origin of origins) {
    let url: URL;
    try {
      url = new URL(origin);
    } catch {
      throw new Error("AUTH_ALLOWED_ORIGINS must contain exact HTTP(S) origins.");
    }
    if (origin.includes("*") || url.origin !== origin || !["http:", "https:"].includes(url.protocol) ||
      (production && url.protocol !== "https:")) {
      throw new Error("Auth origins must be exact HTTP(S) origins; production requires HTTPS.");
    }
  }
  if (env.AUTH_SESSION_IDLE_SECONDS > env.AUTH_SESSION_TTL_SECONDS) {
    throw new Error("Session idle timeout cannot exceed the absolute lifetime.");
  }
  return {
    allowedOrigins: new Set(origins),
    cookieName: secure ? "__Host-massa-session" : "massa-session",
    cookieOptions: { httpOnly: true, secure, sameSite: "lax", path: "/" } as const,
    lifetimeMs: env.AUTH_SESSION_TTL_SECONDS * 1000,
    idleTimeoutMs: env.AUTH_SESSION_IDLE_SECONDS * 1000,
    invitationLifetimeMs: env.AUTH_MEMBER_INVITATION_TTL_SECONDS * 1000,
    loginRateLimit: {
      max: env.AUTH_LOGIN_RATE_LIMIT_MAX,
      timeWindow: env.AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS * 1000,
    },
    publicReservationRateLimits: {
      availability: {
        max: env.PUBLIC_AVAILABILITY_RATE_LIMIT_MAX,
        timeWindow: env.PUBLIC_AVAILABILITY_RATE_LIMIT_WINDOW_SECONDS * 1000,
      },
      create: {
        max: env.PUBLIC_RESERVATION_CREATE_RATE_LIMIT_MAX,
        timeWindow: env.PUBLIC_RESERVATION_CREATE_RATE_LIMIT_WINDOW_SECONDS * 1000,
      },
      access: {
        max: env.PUBLIC_RESERVATION_ACCESS_RATE_LIMIT_MAX,
        timeWindow: env.PUBLIC_RESERVATION_ACCESS_RATE_LIMIT_WINDOW_SECONDS * 1000,
      },
    },
  };
}

export type AuthConfig = ReturnType<typeof readAuthConfig>;