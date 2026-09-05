import {
  InvitationInvalidError,
  MemberAlreadyExistsError,
} from "../errors/membership-errors.js";
import { hashInvitationToken } from "../invitation-tokens.js";
import type { PasswordHasher } from "../password-hasher.js";
import type { MembershipRepository } from "../repositories/membership-repository.js";
import type { MembershipTransactionManager } from "../transactions/membership-transaction-manager.js";
import { assertInvitationUsable } from "./membership-helpers.js";

export class AcceptNewUserInvitationUseCase {
  constructor(
    private readonly repository: MembershipRepository,
    private readonly transactions: MembershipTransactionManager,
    private readonly passwords: PasswordHasher,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: { token: string; password: string }) {
    const tokenHash = hashInvitationToken(input.token);
    const preflight = await this.repository.findInvitationByTokenHash(tokenHash);
    if (!preflight) throw new InvitationInvalidError();
    assertInvitationUsable(preflight, this.now());
    if (await this.repository.findUserByEmail(preflight.email)) throw new InvitationInvalidError();
    const passwordHash = await this.passwords.hash(input.password);

    return this.transactions.execute(async (repository) => {
      const invitation = await repository.findInvitationByTokenHashForUpdate(tokenHash);
      if (!invitation) throw new InvitationInvalidError();
      const now = this.now();
      assertInvitationUsable(invitation, now);
      if (await repository.findUserByEmail(invitation.email)) throw new InvitationInvalidError();
      const user = await repository.createUser({ email: invitation.email, passwordHash });
      if (!user) throw new InvitationInvalidError();
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
