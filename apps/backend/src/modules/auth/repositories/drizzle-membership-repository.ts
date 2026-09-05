import { and, asc, count, desc, eq, gt, isNull } from "drizzle-orm";

import { db } from "../../../db/index.js";
import {
  memberInvitations,
  restaurantMemberships,
  restaurants,
  users,
} from "../../../db/schema/index.js";
import type {
  MembershipRepository,
  PageInput,
} from "./membership-repository.js";

type DatabaseClient = Pick<typeof db, "select" | "insert" | "update">;

export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(private readonly client: DatabaseClient = db) {}

  async listMembers(input: PageInput) {
    return this.client.select({
      id: restaurantMemberships.id,
      user: { id: users.id, email: users.email },
      role: restaurantMemberships.role,
      active: restaurantMemberships.active,
      createdAt: restaurantMemberships.createdAt,
      updatedAt: restaurantMemberships.updatedAt,
    }).from(restaurantMemberships)
      .innerJoin(users, eq(users.id, restaurantMemberships.userId))
      .where(eq(restaurantMemberships.restaurantId, input.restaurantId))
      .orderBy(asc(users.email), asc(restaurantMemberships.id))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
  }

  async countMembers(restaurantId: string) {
    const [row] = await this.client.select({ value: count() }).from(restaurantMemberships)
      .where(eq(restaurantMemberships.restaurantId, restaurantId));
    return row?.value ?? 0;
  }

  async findMemberById(restaurantId: string, membershipId: string) {
    const [member] = await this.client.select({
      id: restaurantMemberships.id,
      user: { id: users.id, email: users.email },
      role: restaurantMemberships.role,
      active: restaurantMemberships.active,
      createdAt: restaurantMemberships.createdAt,
      updatedAt: restaurantMemberships.updatedAt,
    }).from(restaurantMemberships)
      .innerJoin(users, eq(users.id, restaurantMemberships.userId))
      .where(and(
        eq(restaurantMemberships.id, membershipId),
        eq(restaurantMemberships.restaurantId, restaurantId),
      ));
    return member ?? null;
  }

  async findMembershipByRestaurantAndEmail(restaurantId: string, email: string) {
    const [membership] = await this.client.select({ membership: restaurantMemberships })
      .from(restaurantMemberships)
      .innerJoin(users, eq(users.id, restaurantMemberships.userId))
      .where(and(eq(restaurantMemberships.restaurantId, restaurantId), eq(users.email, email)));
    return membership?.membership ?? null;
  }

  async findMembershipForUpdate(restaurantId: string, membershipId: string) {
    const [membership] = await this.client.select().from(restaurantMemberships)
      .where(and(
        eq(restaurantMemberships.id, membershipId),
        eq(restaurantMemberships.restaurantId, restaurantId),
      )).for("update");
    return membership ?? null;
  }

  async countActiveOwners(restaurantId: string) {
    const [row] = await this.client.select({ value: count() }).from(restaurantMemberships)
      .where(and(
        eq(restaurantMemberships.restaurantId, restaurantId),
        eq(restaurantMemberships.role, "OWNER"),
        eq(restaurantMemberships.active, true),
      ));
    return row?.value ?? 0;
  }

  async updateMembership(id: string, changes: { role?: "OWNER" | "STAFF"; active?: boolean; updatedAt: Date }) {
    await this.client.update(restaurantMemberships).set(changes)
      .where(eq(restaurantMemberships.id, id));
  }

  async createMembership(input: { userId: string; restaurantId: string; role: "OWNER" | "STAFF"; active: boolean }) {
    const [membership] = await this.client.insert(restaurantMemberships).values(input)
      .onConflictDoNothing({ target: [restaurantMemberships.userId, restaurantMemberships.restaurantId] })
      .returning();
    return membership ?? null;
  }

  async listInvitations(input: PageInput) {
    return this.client.select().from(memberInvitations)
      .where(eq(memberInvitations.restaurantId, input.restaurantId))
      .orderBy(desc(memberInvitations.createdAt), desc(memberInvitations.id))
      .limit(input.limit)
      .offset((input.page - 1) * input.limit);
  }

  async countInvitations(restaurantId: string) {
    const [row] = await this.client.select({ value: count() }).from(memberInvitations)
      .where(eq(memberInvitations.restaurantId, restaurantId));
    return row?.value ?? 0;
  }

  async findPendingInvitation(restaurantId: string, email: string, now: Date) {
    const [invitation] = await this.client.select().from(memberInvitations).where(and(
      eq(memberInvitations.restaurantId, restaurantId),
      eq(memberInvitations.email, email),
      isNull(memberInvitations.acceptedAt),
      isNull(memberInvitations.revokedAt),
      gt(memberInvitations.expiresAt, now),
    ));
    return invitation ?? null;
  }

  async createInvitation(input: typeof memberInvitations.$inferInsert) {
    const [invitation] = await this.client.insert(memberInvitations).values(input).returning();
    return invitation;
  }

  async findInvitationByIdForUpdate(restaurantId: string, invitationId: string) {
    const [invitation] = await this.client.select().from(memberInvitations).where(and(
      eq(memberInvitations.id, invitationId),
      eq(memberInvitations.restaurantId, restaurantId),
    )).for("update");
    return invitation ?? null;
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const [invitation] = await this.client.select().from(memberInvitations)
      .where(eq(memberInvitations.tokenHash, tokenHash));
    return invitation ?? null;
  }

  async findInvitationByTokenHashForUpdate(tokenHash: string) {
    const [invitation] = await this.client.select().from(memberInvitations)
      .where(eq(memberInvitations.tokenHash, tokenHash)).for("update");
    return invitation ?? null;
  }

  async revokeInvitation(id: string, revokedAt: Date) {
    await this.client.update(memberInvitations).set({ revokedAt })
      .where(eq(memberInvitations.id, id));
  }

  async acceptInvitation(id: string, acceptedAt: Date) {
    await this.client.update(memberInvitations).set({ acceptedAt })
      .where(eq(memberInvitations.id, id));
  }

  async lockRestaurant(restaurantId: string) {
    const rows = await this.client.select({ id: restaurants.id }).from(restaurants)
      .where(eq(restaurants.id, restaurantId)).for("update");
    return rows.length === 1;
  }

  async findUserByEmail(email: string) {
    const [user] = await this.client.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async findUserById(id: string) {
    const [user] = await this.client.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async createUser(input: { email: string; passwordHash: string }) {
    const [user] = await this.client.insert(users).values({ ...input, active: true })
      .onConflictDoNothing({ target: users.email }).returning();
    return user ?? null;
  }
}
