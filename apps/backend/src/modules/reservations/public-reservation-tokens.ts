import { createHash, randomBytes } from "node:crypto";

export function createPublicReservationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPublicReservationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function isPublicReservationToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}