import type { AuthContext } from "../auth-context.js";
import { ForbiddenError } from "../errors/auth-errors.js";
import type { AuthRepository } from "../repositories/auth-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";

export class AuthorizeRestaurantUseCase {
  constructor(private readonly repository: AuthRepository) {}

  async execute(userId: string, restaurantId: string, ownerOnly: boolean): Promise<AuthContext> {
    const membership = await this.repository.findActiveMembership(userId, restaurantId);
    if (!membership) throw new RestaurantNotFoundError();
    if (ownerOnly && membership.role !== "OWNER") throw new ForbiddenError();
    return { userId, restaurantId: membership.restaurantId, role: membership.role };
  }
}
