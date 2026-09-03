import { randomUUID } from "node:crypto";
import type { Restaurant } from "../../restaurants/repositories/restaurants-repository.js";
import type {
  AuthMembership, AuthRepository, AuthSession, AuthUser, NewAuthSession,
} from "./auth-repository.js";

export class InMemoryAuthRepository implements AuthRepository {
  users: AuthUser[] = [];
  sessions: AuthSession[] = [];
  memberships: AuthMembership[] = [];
  restaurants: Restaurant[] = [];

  async findActiveMembership(userId: string, restaurantId: string) {
    const membership = this.memberships.find((item) =>
      item.userId === userId && item.restaurantId === restaurantId && item.active);
    if (!membership || !this.restaurants.some((item) => item.id === restaurantId)) return null;
    return { restaurantId, role: membership.role };
  }

  async listAccessibleRestaurants(userId: string) {
    const allowed = new Set(this.memberships.filter((item) => item.userId === userId && item.active)
      .map((item) => item.restaurantId));
    return this.restaurants.filter((item) => allowed.has(item.id))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  async findUserByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createSession(input: NewAuthSession) {
    const session = { ...input, id: randomUUID() };
    this.sessions.push(session);
    return session;
  }

  async findSessionByTokenHash(tokenHash: string) {
    const session = this.sessions.find((item) => item.tokenHash === tokenHash);
    return session ? { ...session } : null;
  }

  async touchSessionIfValid(id: string, now: Date, idleCutoff: Date) {
    const session = this.sessions.find((item) => item.id === id);
    if (!session || session.revokedAt || session.expiresAt <= now ||
      session.lastActivityAt <= idleCutoff ||
      !this.users.some((user) => user.id === session.userId && user.active)) return false;
    session.lastActivityAt = new Date(Math.max(session.lastActivityAt.getTime(), now.getTime()));
    return true;
  }

  async revokeSession(id: string, now: Date) {
    const session = this.sessions.find((item) => item.id === id);
    if (session && !session.revokedAt) session.revokedAt = now;
  }

  async listActiveMemberships(userId: string) {
    return this.memberships.filter((item) => item.userId === userId && item.active)
      .sort((a, b) => a.restaurantId.localeCompare(b.restaurantId))
      .map(({ restaurantId, role }) => ({ restaurantId, role }));
  }
}
