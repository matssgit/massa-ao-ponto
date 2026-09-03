import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isSessionToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function matchesCsrfToken(expected: string, received: string | undefined): boolean {
  if (!isSessionToken(received)) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length &&
    timingSafeEqual(expectedBytes, receivedBytes);
}
