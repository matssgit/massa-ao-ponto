import {
  InvitationInvalidError,
  MemberAlreadyExistsError,
} from "../errors/membership-errors.js";
import { hashInvitationToken } from "../invitation-tokens.js";
import type { MembershipTransactionManager } from "../transactions/membership-transaction-manager.js";
import { assertInvitationUsable } from "./membership-helpers.js";

export class AcceptExistingUserInvitationUseCase {
  constructor(
    private readonly transactions: MembershipTransactionManager,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: { token: string; userId: string }) {
    const tokenHash = hashInvitationToken(input.token);
    return this.transactions.execute(async (repository) => {
      const invitation = await repository.findInvitationByTokenHashForUpdate(tokenHash);
      if (!invitation) throw new InvitationInvalidError();
      const now = this.now();
      assertInvitationUsable(invitation, now);
      const user = await repository.findUserById(input.userId);
      if (!user?.active || user.email !== invitation.email) throw new InvitationInvalidError();
      if (await repository.findMembershipByRestaurantAndEmail(invitation.restaurantId, user.email)) {
        throw new MemberAlreadyExistsError();
      }
      const membership = await repository.createMembership({
        userId: user.id,
        restaurantId: invitation.restaurantId,
        role: invitation.role,
        active: true,
      });
      if (!membership) throw new MemberAlreadyExistsError();
      await repository.acceptInvitation(invitation.id, now);
      const member = await repository.findMemberById(invitation.restaurantId, membership.id);
      if (!member) throw new InvitationInvalidError();
      return member;
    });
  }
}
