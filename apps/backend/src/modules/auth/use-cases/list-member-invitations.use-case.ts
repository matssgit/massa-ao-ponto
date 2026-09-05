import type { MembershipRepository, PageInput } from "../repositories/membership-repository.js";
import { paginationMeta, publicInvitation } from "./membership-helpers.js";

export class ListMemberInvitationsUseCase {
  constructor(private readonly repository: MembershipRepository) {}

  async execute(input: PageInput) {
    const [invitations, total] = await Promise.all([
      this.repository.listInvitations(input),
      this.repository.countInvitations(input.restaurantId),
    ]);
    return {
      data: invitations.map(publicInvitation),
      meta: paginationMeta(input.page, input.limit, total),
    };
  }
}
