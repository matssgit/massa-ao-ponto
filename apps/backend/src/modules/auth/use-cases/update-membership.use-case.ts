import { LastActiveOwnerError, MemberNotFoundError } from "../errors/membership-errors.js";
import type { MembershipRole } from "../repositories/membership-repository.js";
import type { MembershipTransactionManager } from "../transactions/membership-transaction-manager.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";

export class UpdateMembershipUseCase {
  constructor(
    private readonly transactions: MembershipTransactionManager,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: {
    restaurantId: string;
    membershipId: string;
    role?: MembershipRole;
    active?: boolean;
  }) {
    return this.transactions.execute(async (repository) => {
      if (!await repository.lockRestaurant(input.restaurantId)) throw new RestaurantNotFoundError();
      const current = await repository.findMembershipForUpdate(input.restaurantId, input.membershipId);
      if (!current) throw new MemberNotFoundError();
      const nextRole = input.role ?? current.role;
      const nextActive = input.active ?? current.active;
      const reducesActiveOwners = current.role === "OWNER" && current.active &&
        (nextRole !== "OWNER" || !nextActive);
      if (reducesActiveOwners && await repository.countActiveOwners(input.restaurantId) <= 1) {
        throw new LastActiveOwnerError();
      }
      await repository.updateMembership(current.id, {
        ...(input.role === undefined ? {} : { role: input.role }),
        ...(input.active === undefined ? {} : { active: input.active }),
        updatedAt: this.now(),
      });
      const updated = await repository.findMemberById(input.restaurantId, input.membershipId);
      if (!updated) throw new MemberNotFoundError();
      return updated;
    });
  }
}
