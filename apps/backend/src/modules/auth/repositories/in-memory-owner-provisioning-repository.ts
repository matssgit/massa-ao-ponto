import { randomUUID } from "node:crypto";
import { OwnerEmailAlreadyExistsError, OwnerMembershipAlreadyExistsError } from "../errors/owner-provisioning-errors.js";
import type { AuthMembership, AuthUser } from "./auth-repository.js";
import type { OwnerProvisioningRepository } from "./owner-provisioning-repository.js";

export class InMemoryOwnerProvisioningRepository implements OwnerProvisioningRepository {
  users: AuthUser[] = [];
  memberships: AuthMembership[] = [];

  async createUser(input: { email: string; passwordHash: string }): Promise<{ id: string }> {
    if (this.users.some((user) => user.email === input.email)) throw new OwnerEmailAlreadyExistsError();
    const user = { ...input, id: randomUUID(), active: true, createdAt: new Date(), updatedAt: new Date() };
    this.users.push(user);
    return { id: user.id };
  }

  async createOwnerMembership(input: { userId: string; restaurantId: string }): Promise<{ id: string }> {
    if (this.memberships.some((membership) => membership.userId === input.userId && membership.restaurantId === input.restaurantId)) {
      throw new OwnerMembershipAlreadyExistsError();
    }
    const membership: AuthMembership = {
      ...input, id: randomUUID(), role: "OWNER", active: true, createdAt: new Date(), updatedAt: new Date(),
    };
    this.memberships.push(membership);
    return { id: membership.id };
  }
}
