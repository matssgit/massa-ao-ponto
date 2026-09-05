import { randomUUID } from "node:crypto";

import type {
  AuthUserRecord,
  MemberInvitation,
  Membership,
  MembershipRepository,
  PageInput,
} from "./membership-repository.js";

export class InMemoryMembershipRepository implements MembershipRepository {
  users: AuthUserRecord[] = [];
  memberships: Membership[] = [];
  invitations: MemberInvitation[] = [];
  restaurantIds: string[] = [];

  async listMembers(input: PageInput) {
    return this.memberships.filter((membership) => membership.restaurantId === input.restaurantId)
      .map((membership) => this.memberView(membership))
      .filter((member) => member !== null)
      .sort((a, b) => a.user.email.localeCompare(b.user.email) || a.id.localeCompare(b.id))
      .slice((input.page - 1) * input.limit, input.page * input.limit);
  }

  async countMembers(restaurantId: string) {
    return this.memberships.filter((membership) => membership.restaurantId === restaurantId).length;
  }

  async findMemberById(restaurantId: string, membershipId: string) {
    const membership = this.memberships.find((item) =>
      item.id === membershipId && item.restaurantId === restaurantId);
    return membership ? this.memberView(membership) : null;
  }

  async findMembershipByRestaurantAndEmail(restaurantId: string, email: string) {
    const user = this.users.find((item) => item.email === email);
    return user ? this.memberships.find((item) =>
      item.restaurantId === restaurantId && item.userId === user.id) ?? null : null;
  }

  async findMembershipForUpdate(restaurantId: string, membershipId: string) {
    return this.memberships.find((item) =>
      item.id === membershipId && item.restaurantId === restaurantId) ?? null;
  }

  async countActiveOwners(restaurantId: string) {
    return this.memberships.filter((item) =>
      item.restaurantId === restaurantId && item.role === "OWNER" && item.active).length;
  }

  async updateMembership(id: string, changes: { role?: "OWNER" | "STAFF"; active?: boolean; updatedAt: Date }) {
    const membership = this.memberships.find((item) => item.id === id);
    if (membership) Object.assign(membership, changes);
  }

  async createMembership(input: { userId: string; restaurantId: string; role: "OWNER" | "STAFF"; active: boolean }) {
    if (this.memberships.some((item) =>
      item.userId === input.userId && item.restaurantId === input.restaurantId)) return null;
    const now = new Date();
    const membership: Membership = { ...input, id: randomUUID(), createdAt: now, updatedAt: now };
    this.memberships.push(membership);
    return membership;
  }

  async listInvitations(input: PageInput) {
    return this.invitations.filter((invitation) => invitation.restaurantId === input.restaurantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
      .slice((input.page - 1) * input.limit, input.page * input.limit);
  }

  async countInvitations(restaurantId: string) {
    return this.invitations.filter((invitation) => invitation.restaurantId === restaurantId).length;
  }

  async findPendingInvitation(restaurantId: string, email: string, now: Date) {
    return this.invitations.find((item) => item.restaurantId === restaurantId && item.email === email &&
      !item.acceptedAt && !item.revokedAt && item.expiresAt > now) ?? null;
  }

  async createInvitation(input: Omit<MemberInvitation, "id"> & { id?: string }) {
    const invitation: MemberInvitation = { ...input, id: input.id ?? randomUUID() };
    this.invitations.push(invitation);
    return invitation;
  }

  async findInvitationByIdForUpdate(restaurantId: string, invitationId: string) {
    return this.invitations.find((item) =>
      item.id === invitationId && item.restaurantId === restaurantId) ?? null;
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return this.invitations.find((item) => item.tokenHash === tokenHash) ?? null;
  }

  async findInvitationByTokenHashForUpdate(tokenHash: string) {
    return this.findInvitationByTokenHash(tokenHash);
  }

  async revokeInvitation(id: string, revokedAt: Date) {
    const invitation = this.invitations.find((item) => item.id === id);
    if (invitation) invitation.revokedAt = revokedAt;
  }

  async acceptInvitation(id: string, acceptedAt: Date) {
    const invitation = this.invitations.find((item) => item.id === id);
    if (invitation) invitation.acceptedAt = acceptedAt;
  }

  async lockRestaurant(restaurantId: string) {
    return this.restaurantIds.includes(restaurantId);
  }

  async findUserByEmail(email: string) {
    return this.users.find((item) => item.email === email) ?? null;
  }

  async findUserById(id: string) {
    return this.users.find((item) => item.id === id) ?? null;
  }

  async createUser(input: { email: string; passwordHash: string }) {
    if (this.users.some((item) => item.email === input.email)) return null;
    const now = new Date();
    const user: AuthUserRecord = {
      ...input, id: randomUUID(), active: true, createdAt: now, updatedAt: now,
    };
    this.users.push(user);
    return user;
  }

  private memberView(membership: Membership) {
    const user = this.users.find((item) => item.id === membership.userId);
    return user ? {
      id: membership.id,
      user: { id: user.id, email: user.email },
      role: membership.role,
      active: membership.active,
      createdAt: membership.createdAt,
      updatedAt: membership.updatedAt,
    } : null;
  }
}
