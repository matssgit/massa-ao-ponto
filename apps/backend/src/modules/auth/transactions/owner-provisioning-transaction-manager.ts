import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import type { OwnerProvisioningRepository } from "../repositories/owner-provisioning-repository.js";

export interface OwnerProvisioningRepositories {
  owner: OwnerProvisioningRepository;
  restaurants: RestaurantsRepository;
}

export interface OwnerProvisioningTransactionManager {
  execute<T>(work: (repositories: OwnerProvisioningRepositories) => Promise<T>): Promise<T>;
}
