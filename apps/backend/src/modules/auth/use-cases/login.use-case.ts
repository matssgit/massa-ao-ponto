import { InvalidCredentialsError } from "../errors/auth-errors.js";
import { normalizeEmail } from "../normalize-email.js";
import type { PasswordHasher } from "../password-hasher.js";
import { publicUser, type AuthRepository } from "../repositories/auth-repository.js";
import { createSessionToken, hashSessionToken } from "../session-tokens.js";

export class LoginUseCase {
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwords: PasswordHasher,
    private readonly dummyPasswordHash: string,
    private readonly lifetimeMs: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(input: { email: string; password: string }) {
    const user = await this.repository.findUserByEmail(normalizeEmail(input.email));
    // Missing/inactive accounts also pay the password verification cost.
    const validPassword = await this.passwords.verify(
      user?.passwordHash ?? this.dummyPasswordHash, input.password,
    );
    if (!user?.active || !validPassword) throw new InvalidCredentialsError();

    const now = this.now();
    const token = createSessionToken();
    const session = await this.repository.createSession({
      tokenHash: hashSessionToken(token),
      userId: user.id,
      csrfToken: createSessionToken(),
      createdAt: now,
      lastActivityAt: now,
      expiresAt: new Date(now.getTime() + this.lifetimeMs),
      revokedAt: null,
    });

    return { user: publicUser(user), token, expiresAt: session.expiresAt };
  }
}
