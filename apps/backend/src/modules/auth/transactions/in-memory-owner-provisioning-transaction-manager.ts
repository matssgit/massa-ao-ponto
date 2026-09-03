import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { InMemoryOwnerProvisioningRepository } from "../repositories/in-memory-owner-provisioning-repository.js";
import type { OwnerProvisioningRepositories, OwnerProvisioningTransactionManager } from "./owner-provisioning-transaction-manager.js";

export class InMemoryOwnerProvisioningTransactionManager implements OwnerProvisioningTransactionManager {
  constructor(
    readonly owner = new InMemoryOwnerProvisioningRepository(),
    readonly restaurants = new InMemoryRestaurantsRepository(),
  ) {}

  async execute<T>(work: (repositories: OwnerProvisioningRepositories) => Promise<T>): Promise<T> {
    const users = structuredClone(this.owner.users);
    const memberships = structuredClone(this.owner.memberships);
    const restaurants = structuredClone(this.restaurants.items);
    try {
      return await work({ owner: this.owner, restaurants: this.restaurants });
    } catch (error) {
      this.owner.users = users;
      this.owner.memberships = memberships;
      this.restaurants.items = restaurants;
      throw error;
    }
  }
}
