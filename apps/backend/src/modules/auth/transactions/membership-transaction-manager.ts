import type { MembershipRepository } from "../repositories/membership-repository.js";

export interface MembershipTransactionManager {
  execute<T>(work: (repository: MembershipRepository) => Promise<T>): Promise<T>;
}
