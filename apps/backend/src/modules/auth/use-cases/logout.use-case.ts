import { assertSessionCsrf } from "../csrf.js";
import type { AuthRepository } from "../repositories/auth-repository.js";
import type { ValidateSessionUseCase } from "./validate-session.use-case.js";

export class LogoutUseCase {
  constructor(
    private readonly repository: AuthRepository,
    private readonly validate: ValidateSessionUseCase,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(token: string | undefined, csrfToken: string | undefined) {
    const authenticated = await this.validate.execute(token, false);
    assertSessionCsrf(authenticated.session.csrfToken, csrfToken);
    await this.repository.revokeSession(authenticated.session.id, this.now());
  }
}
