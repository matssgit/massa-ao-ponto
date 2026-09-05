import { InvitationAlreadyUsedError, InvitationNotFoundError } from "../errors/membership-errors.js";
import type { MembershipTransactionManager } from "../transactions/membership-transaction-manager.js";

export class RevokeMemberInvitationUseCase {
  constructor(
    private readonly transactions: MembershipTransactionManager,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(restaurantId: string, invitationId: string): Promise<void> {
    await this.transactions.execute(async (repository) => {
      const invitation = await repository.findInvitationByIdForUpdate(restaurantId, invitationId);
      if (!invitation) throw new InvitationNotFoundError();
      if (invitation.acceptedAt) throw new InvitationAlreadyUsedError();
      if (invitation.revokedAt) return;
      await repository.revokeInvitation(invitation.id, this.now());
    });
  }
}
