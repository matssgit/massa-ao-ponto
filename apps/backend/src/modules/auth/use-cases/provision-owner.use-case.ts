import { CreateRestaurantUseCase } from "../../restaurants/use-cases/create-restaurant.use-case.js";
import type { PasswordHasher } from "../password-hasher.js";
import { parseProvisionOwnerInput, type ProvisionOwnerInput } from "../schemas/provision-owner.schema.js";
import type { OwnerProvisioningTransactionManager } from "../transactions/owner-provisioning-transaction-manager.js";

export interface ProvisionOwnerResult {
  userId: string;
  restaurantId: string;
  membershipId: string;
}

export class ProvisionOwnerUseCase {
  constructor(
    private readonly transactions: OwnerProvisioningTransactionManager,
    private readonly passwords: PasswordHasher,
  ) {}

  async execute(input: ProvisionOwnerInput): Promise<ProvisionOwnerResult> {
    const data = parseProvisionOwnerInput(input);
    const passwordHash = await this.passwords.hash(data.password);

    return this.transactions.execute(async ({ owner, restaurants }) => {
      const user = await owner.createUser({ email: data.email, passwordHash });
      const restaurant = await new CreateRestaurantUseCase(restaurants).execute(data.restaurant);
      const membership = await owner.createOwnerMembership({ userId: user.id, restaurantId: restaurant.id });
      return { userId: user.id, restaurantId: restaurant.id, membershipId: membership.id };
    });
  }
}
