import type {
  memberInvitations,
  restaurantMemberships,
  users,
} from "../../../db/schema/index.js";

export type Membership = typeof restaurantMemberships.$inferSelect;
export type MemberInvitation = typeof memberInvitations.$inferSelect;
export type AuthUserRecord = typeof users.$inferSelect;
export type MembershipRole = Membership["role"];

export interface MemberView {
  id: string;
  user: { id: string; email: string };
  role: MembershipRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageInput {
  restaurantId: string;
  page: number;
  limit: number;
}

export interface MembershipRepository {
  listMembers(input: PageInput): Promise<MemberView[]>;
  countMembers(restaurantId: string): Promise<number>;
  findMemberById(restaurantId: string, membershipId: string): Promise<MemberView | null>;
  findMembershipByRestaurantAndEmail(restaurantId: string, email: string): Promise<Membership | null>;
  findMembershipForUpdate(restaurantId: string, membershipId: string): Promise<Membership | null>;
  countActiveOwners(restaurantId: string): Promise<number>;
  updateMembership(id: string, changes: { role?: MembershipRole; active?: boolean; updatedAt: Date }): Promise<void>;
  createMembership(input: { userId: string; restaurantId: string; role: MembershipRole; active: boolean }): Promise<Membership | null>;

  listInvitations(input: PageInput): Promise<MemberInvitation[]>;
  countInvitations(restaurantId: string): Promise<number>;
  findPendingInvitation(restaurantId: string, email: string, now: Date): Promise<MemberInvitation | null>;
  createInvitation(input: typeof memberInvitations.$inferInsert): Promise<MemberInvitation>;
  findInvitationByIdForUpdate(restaurantId: string, invitationId: string): Promise<MemberInvitation | null>;
  findInvitationByTokenHash(tokenHash: string): Promise<MemberInvitation | null>;
  findInvitationByTokenHashForUpdate(tokenHash: string): Promise<MemberInvitation | null>;
  revokeInvitation(id: string, revokedAt: Date): Promise<void>;
  acceptInvitation(id: string, acceptedAt: Date): Promise<void>;

  lockRestaurant(restaurantId: string): Promise<boolean>;
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
  createUser(input: { email: string; passwordHash: string }): Promise<AuthUserRecord | null>;
}
