import type { restaurantMemberships, sessions, users } from "../../../db/schema/index.js";
import type { Restaurant } from "../../restaurants/repositories/restaurants-repository.js";

export type AuthUser = typeof users.$inferSelect;
export type AuthSession = typeof sessions.$inferSelect;
export type AuthMembership = typeof restaurantMemberships.$inferSelect;
export type PublicUser = Pick<AuthUser, "id" | "email">;
export type ActiveMembership = Pick<AuthMembership, "restaurantId" | "role">;
export type NewAuthSession = Omit<AuthSession, "id">;

export function publicUser(user: AuthUser): PublicUser {
  return { id: user.id, email: user.email };
}

export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  findUserById(id: string): Promise<AuthUser | null>;
  createSession(input: NewAuthSession): Promise<AuthSession>;
  findSessionByTokenHash(tokenHash: string): Promise<AuthSession | null>;
  touchSessionIfValid(id: string, now: Date, idleCutoff: Date): Promise<boolean>;
  revokeSession(id: string, now: Date): Promise<void>;
  listActiveMemberships(userId: string): Promise<ActiveMembership[]>;
  findActiveMembership(userId: string, restaurantId: string): Promise<ActiveMembership | null>;
  listAccessibleRestaurants(userId: string): Promise<Restaurant[]>;
}
