import { createInvitationToken, hashInvitationToken } from "../invitation-tokens.js";
import {
  InvitationAlreadyPendingError,
  MemberAlreadyExistsError,
} from "../errors/membership-errors.js";
import type { MembershipTransactionManager } from "../transactions/membership-transaction-manager.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { publicInvitation } from "./membership-helpers.js";

export class CreateMemberInvitationUseCase {
  constructor(
    private readonly transactions: MembershipTransactionManager,
    private readonly lifetimeMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: { restaurantId: string; email: string; createdByUserId: string }) {
    const token = createInvitationToken();
    const tokenHash = hashInvitationToken(token);
    return this.transactions.execute(async (repository) => {
      if (!await repository.lockRestaurant(input.restaurantId)) throw new RestaurantNotFoundError();
      const now = this.now();
      if (await repository.findMembershipByRestaurantAndEmail(input.restaurantId, input.email)) {
        throw new MemberAlreadyExistsError();
      }
      if (await repository.findPendingInvitation(input.restaurantId, input.email, now)) {
        throw new InvitationAlreadyPendingError();
      }
      const invitation = await repository.createInvitation({
        restaurantId: input.restaurantId,
        email: input.email,
        role: "STAFF",
        tokenHash,
        createdByUserId: input.createdByUserId,
        createdAt: now,
        expiresAt: new Date(now.getTime() + this.lifetimeMs),
        acceptedAt: null,
        revokedAt: null,
      });
      return { invitation: publicInvitation(invitation), token };
    });
  }
}
