import { db } from "../../../db/index.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { DrizzleOwnerProvisioningRepository } from "../repositories/drizzle-owner-provisioning-repository.js";
import type { OwnerProvisioningRepositories, OwnerProvisioningTransactionManager } from "./owner-provisioning-transaction-manager.js";

export class DrizzleOwnerProvisioningTransactionManager implements OwnerProvisioningTransactionManager {
  async execute<T>(work: (repositories: OwnerProvisioningRepositories) => Promise<T>): Promise<T> {
    return db.transaction((tx) => work({
      owner: new DrizzleOwnerProvisioningRepository(tx),
      restaurants: new DrizzleRestaurantsRepository(tx),
    }));
  }
}
