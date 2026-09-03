import { and, asc, eq, exists, gt, isNull, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { restaurantMemberships, restaurants, sessions, users } from "../../../db/schema/index.js";
import type { AuthRepository, NewAuthSession } from "./auth-repository.js";

export class DrizzleAuthRepository implements AuthRepository {
  async findActiveMembership(userId: string, restaurantId: string) {
    const [membership] = await db.select({
      restaurantId: restaurantMemberships.restaurantId,
      role: restaurantMemberships.role,
    }).from(restaurantMemberships)
      .innerJoin(restaurants, eq(restaurants.id, restaurantMemberships.restaurantId))
      .where(and(
        eq(restaurantMemberships.userId, userId),
        eq(restaurantMemberships.restaurantId, restaurantId),
        eq(restaurantMemberships.active, true),
      ));
    return membership ?? null;
  }

  async listAccessibleRestaurants(userId: string) {
    const rows = await db.select({ restaurant: restaurants }).from(restaurantMemberships)
      .innerJoin(restaurants, eq(restaurants.id, restaurantMemberships.restaurantId))
      .where(and(eq(restaurantMemberships.userId, userId), eq(restaurantMemberships.active, true)))
      .orderBy(asc(restaurants.name), asc(restaurants.id));
    return rows.map(({ restaurant }) => ({ ...restaurant, phone: restaurant.phone ?? "" }));
  }

  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async findUserById(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async createSession(input: NewAuthSession) {
    const [session] = await db.insert(sessions).values(input).returning();
    return session;
  }

  async findSessionByTokenHash(tokenHash: string) {
    const [session] = await db.select().from(sessions).where(eq(sessions.tokenHash, tokenHash));
    return session ?? null;
  }

  async touchSessionIfValid(id: string, now: Date, idleCutoff: Date) {
    // A stale validator cannot revive a revoked/expired session or move activity backwards.
    const updated = await db.update(sessions)
      .set({ lastActivityAt: sql`greatest(${sessions.lastActivityAt}, ${now.toISOString()}::timestamptz)` })
      .where(and(
        eq(sessions.id, id),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now),
        gt(sessions.lastActivityAt, idleCutoff),
        exists(db.select({ id: users.id }).from(users).where(and(
          eq(users.id, sessions.userId),
          eq(users.active, true),
        ))),
      ))
      .returning({ id: sessions.id });
    return updated.length === 1;
  }

  async revokeSession(id: string, now: Date) {
    await db.update(sessions).set({ revokedAt: now })
      .where(and(eq(sessions.id, id), isNull(sessions.revokedAt)));
  }

  async listActiveMemberships(userId: string) {
    return db.select({
      restaurantId: restaurantMemberships.restaurantId,
      role: restaurantMemberships.role,
    }).from(restaurantMemberships)
      .where(and(eq(restaurantMemberships.userId, userId), eq(restaurantMemberships.active, true)))
      .orderBy(asc(restaurantMemberships.restaurantId));
  }
}
