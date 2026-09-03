import type { AuthConfig } from "./auth-config.js";
import { InvalidCsrfError } from "./errors/auth-errors.js";
import { matchesCsrfToken } from "./session-tokens.js";

export function assertTrustedAuthOrigin(
  config: AuthConfig,
  origin: string | undefined,
  authHeader: string | string[] | undefined,
): void {
  if (!origin || !config.allowedOrigins.has(origin) || authHeader !== "1") {
    throw new InvalidCsrfError();
  }
}

export function assertSessionCsrf(expected: string, received: string | string[] | undefined): void {
  if (typeof received !== "string" || !matchesCsrfToken(expected, received)) {
    throw new InvalidCsrfError();
  }
}
