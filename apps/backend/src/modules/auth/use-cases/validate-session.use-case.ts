import { UnauthenticatedError } from "../errors/auth-errors.js";
import type { AuthRepository, AuthSession } from "../repositories/auth-repository.js";
import { hashSessionToken, isSessionToken } from "../session-tokens.js";

export class ValidateSessionUseCase {
  constructor(
    private readonly repository: AuthRepository,
    private readonly idleTimeoutMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(token: string | undefined, touch = true) {
    if (!isSessionToken(token)) throw new UnauthenticatedError();
    const session = await this.repository.findSessionByTokenHash(hashSessionToken(token));
    const now = this.now();
    const idleCutoff = new Date(now.getTime() - this.idleTimeoutMs);
    if (!session || session.revokedAt || session.expiresAt <= now ||
      session.lastActivityAt <= idleCutoff) throw new UnauthenticatedError();

    const user = await this.repository.findUserById(session.userId);
    if (!user?.active) throw new UnauthenticatedError();
    if (touch) await this.touch(session);
    return { session, user };
  }

  async touch(session: AuthSession): Promise<void> {
    const now = this.now();
    const idleCutoff = new Date(now.getTime() - this.idleTimeoutMs);
    if (!await this.repository.touchSessionIfValid(session.id, now, idleCutoff)) {
      throw new UnauthenticatedError();
    }
  }
}
