import { db } from "../../../db/index.js";
import { DrizzleMembershipRepository } from "../repositories/drizzle-membership-repository.js";
import type { MembershipTransactionManager } from "./membership-transaction-manager.js";

export class DrizzleMembershipTransactionManager implements MembershipTransactionManager {
  async execute<T>(work: (repository: DrizzleMembershipRepository) => Promise<T>): Promise<T> {
    return db.transaction((tx) => work(new DrizzleMembershipRepository(tx)));
  }
}
