import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import type { PasswordHasher } from "../password-hasher.js";
import { InMemoryMembershipRepository } from "../repositories/in-memory-membership-repository.js";
import { InMemoryMembershipTransactionManager } from "../transactions/in-memory-membership-transaction-manager.js";
import { AcceptNewUserInvitationUseCase } from "./accept-new-user-invitation.use-case.js";
import { CreateMemberInvitationUseCase } from "./create-member-invitation.use-case.js";
import { ListMemberInvitationsUseCase } from "./list-member-invitations.use-case.js";
import { ListMembersUseCase } from "./list-members.use-case.js";
import { UpdateMembershipUseCase } from "./update-membership.use-case.js";

const passwords: PasswordHasher = {
  hash: async (password) => `hash:${password}`,
  verify: async (hash, password) => hash === `hash:${password}`,
};

describe("Membership use cases", () => {
  let repository: InMemoryMembershipRepository;
  let transactions: InMemoryMembershipTransactionManager;
  let restaurantId: string;
  let ownerId: string;
  let ownerMembershipId: string;

  beforeEach(() => {
    repository = new InMemoryMembershipRepository();
    transactions = new InMemoryMembershipTransactionManager(repository);
    restaurantId = randomUUID();
    ownerId = randomUUID();
    ownerMembershipId = randomUUID();
    const now = new Date();
    repository.restaurantIds.push(restaurantId);
    repository.users.push({
      id: ownerId, email: "owner@example.com", passwordHash: "hash", active: true,
      createdAt: now, updatedAt: now,
    });
    repository.memberships.push({
      id: ownerMembershipId, userId: ownerId, restaurantId, role: "OWNER", active: true,
      createdAt: now, updatedAt: now,
    });
  });

  it("lists members with deterministic pagination", async () => {
    const staffId = randomUUID();
    const now = new Date();
    repository.users.push({ id: staffId, email: "a@example.com", passwordHash: "hash", active: true, createdAt: now, updatedAt: now });
    repository.memberships.push({ id: randomUUID(), userId: staffId, restaurantId, role: "STAFF", active: true, createdAt: now, updatedAt: now });
    const result = await new ListMembersUseCase(repository).execute({ restaurantId, page: 1, limit: 1 });
    expect(result.data[0].user.email).toBe("a@example.com");
    expect(result.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2, hasNext: true, hasPrevious: false });
  });

  it("rolls back a forbidden last-owner reduction", async () => {
    await expect(new UpdateMembershipUseCase(transactions).execute({
      restaurantId, membershipId: ownerMembershipId, active: false,
    })).rejects.toMatchObject({ name: "LastActiveOwnerError" });
    expect(repository.memberships[0]).toMatchObject({ role: "OWNER", active: true });
  });

  it("creates one pending invitation and never lists its hash", async () => {
    const create = new CreateMemberInvitationUseCase(transactions, 60_000);
    const created = await create.execute({ restaurantId, email: "staff@example.com", createdByUserId: ownerId });
    expect(repository.invitations[0].tokenHash).not.toBe(created.token);
    await expect(create.execute({ restaurantId, email: "staff@example.com", createdByUserId: ownerId }))
      .rejects.toMatchObject({ name: "InvitationAlreadyPendingError" });
    const listed = await new ListMemberInvitationsUseCase(repository).execute({ restaurantId, page: 1, limit: 20 });
    expect(listed.data[0]).not.toHaveProperty("tokenHash");
    expect(listed.data[0]).not.toHaveProperty("token");
  });

  it("accepts a new User atomically and rejects token reuse", async () => {
    const created = await new CreateMemberInvitationUseCase(transactions, 60_000)
      .execute({ restaurantId, email: "new@example.com", createdByUserId: ownerId });
    const useCase = new AcceptNewUserInvitationUseCase(repository, transactions, passwords);
    const member = await useCase.execute({ token: created.token, password: "long-enough-password" });
    expect(member).toMatchObject({ user: { email: "new@example.com" }, role: "STAFF", active: true });
    expect(repository.users.find((user) => user.email === "new@example.com")?.passwordHash)
      .toBe("hash:long-enough-password");
    await expect(useCase.execute({ token: created.token, password: "long-enough-password" }))
      .rejects.toMatchObject({ name: "InvitationAlreadyUsedError" });
    expect(repository.memberships.filter((membership) => membership.userId === member.user.id)).toHaveLength(1);
  });
});
