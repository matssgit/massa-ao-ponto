import { InMemoryMembershipRepository } from "../repositories/in-memory-membership-repository.js";
import type { MembershipTransactionManager } from "./membership-transaction-manager.js";

export class InMemoryMembershipTransactionManager implements MembershipTransactionManager {
  constructor(readonly repository = new InMemoryMembershipRepository()) {}

  async execute<T>(work: (repository: InMemoryMembershipRepository) => Promise<T>): Promise<T> {
    const snapshot = structuredClone({
      users: this.repository.users,
      memberships: this.repository.memberships,
      invitations: this.repository.invitations,
      restaurantIds: this.repository.restaurantIds,
    });
    try {
      return await work(this.repository);
    } catch (error) {
      this.repository.users = snapshot.users;
      this.repository.memberships = snapshot.memberships;
      this.repository.invitations = snapshot.invitations;
      this.repository.restaurantIds = snapshot.restaurantIds;
      throw error;
    }
  }
}
