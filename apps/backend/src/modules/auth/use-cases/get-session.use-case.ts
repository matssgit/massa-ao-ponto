import { publicUser, type AuthRepository } from "../repositories/auth-repository.js";
import type { ValidateSessionUseCase } from "./validate-session.use-case.js";

export class GetSessionUseCase {
  constructor(
    private readonly repository: AuthRepository,
    private readonly validate: ValidateSessionUseCase,
  ) {}

  async execute(token: string | undefined) {
    const { session, user } = await this.validate.execute(token);
    return {
      user: publicUser(user),
      memberships: await this.repository.listActiveMemberships(user.id),
      csrfToken: session.csrfToken,
    };
  }
}
