import type { MembershipRepository, PageInput } from "../repositories/membership-repository.js";
import { paginationMeta } from "./membership-helpers.js";

export class ListMembersUseCase {
  constructor(private readonly repository: MembershipRepository) {}

  async execute(input: PageInput) {
    const [data, total] = await Promise.all([
      this.repository.listMembers(input),
      this.repository.countMembers(input.restaurantId),
    ]);
    return { data, meta: paginationMeta(input.page, input.limit, total) };
  }
}
