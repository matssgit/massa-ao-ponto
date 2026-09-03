import { randomUUID } from "node:crypto";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { InvalidCredentialsError, InvalidCsrfError, UnauthenticatedError } from "../errors/auth-errors.js";
import { Argon2PasswordHasher } from "../password-hasher.js";
import { InMemoryAuthRepository } from "../repositories/in-memory-auth-repository.js";
import { hashSessionToken } from "../session-tokens.js";
import { GetSessionUseCase } from "./get-session.use-case.js";
import { LoginUseCase } from "./login.use-case.js";
import { LogoutUseCase } from "./logout.use-case.js";
import { ValidateSessionUseCase } from "./validate-session.use-case.js";

describe("Auth use cases", () => {
  const passwords = new Argon2PasswordHasher();
  const lifetime = 8 * 60 * 60 * 1000;
  const idle = 30 * 60 * 1000;
  let passwordHash: string;
  let dummyHash: string;
  let repository: InMemoryAuthRepository;
  let login: LoginUseCase;
  let validate: ValidateSessionUseCase;
  let getSession: GetSessionUseCase;
  let logout: LogoutUseCase;
  let now: Date;

  beforeAll(async () => {
    passwordHash = await passwords.hash("correct-password");
    dummyHash = await passwords.hash("dummy-password");
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    now = new Date("2026-09-02T12:00:00Z");
    repository = new InMemoryAuthRepository();
    repository.users.push({
      id: randomUUID(), email: "owner@example.com", passwordHash, active: true,
      createdAt: now, updatedAt: now,
    });
    login = new LoginUseCase(repository, passwords, dummyHash, lifetime, () => now);
    validate = new ValidateSessionUseCase(repository, idle, () => now);
    getSession = new GetSessionUseCase(repository, validate);
    logout = new LogoutUseCase(repository, validate, () => now);
  });

  const credentials = { email: "owner@example.com", password: "correct-password" };

  it("hashes with salted Argon2id and verifies without storing plaintext", async () => {
    const second = await passwords.hash(credentials.password);
    expect(passwordHash).toMatch(/^\$argon2id\$v=19\$/);
    expect(passwordHash.split("$")[3].split(",").sort()).toEqual(["m=65536", "p=1", "t=3"]);
    expect(second).not.toBe(passwordHash);
    expect(await passwords.verify(passwordHash, credentials.password)).toBe(true);
    expect(await passwords.verify(passwordHash, "wrong")).toBe(false);
    expect(passwordHash).not.toContain(credentials.password);
  });

  it("normalizes email and persists only the session hash with absolute expiry", async () => {
    const result = await login.execute({ ...credentials, email: "  OWNER@EXAMPLE.COM  " });
    expect(result.user).toEqual({ id: repository.users[0].id, email: credentials.email });
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(repository.sessions).toHaveLength(1);
    expect(repository.sessions[0]).toMatchObject({
      tokenHash: hashSessionToken(result.token), userId: result.user.id,
      createdAt: now, lastActivityAt: now, revokedAt: null,
      expiresAt: new Date(now.getTime() + lifetime),
    });
    expect(JSON.stringify(repository.sessions)).not.toContain(result.token);
    expect(repository.sessions[0]).not.toHaveProperty("restaurantId");
    expect(repository.sessions[0]).not.toHaveProperty("role");
  });

  it.each(["wrong password", "missing email", "inactive"] as const)(
    "uses generic errors and verification for %s without persistence", async (scenario) => {
      const input = { ...credentials };
      if (scenario === "wrong password") input.password = "wrong";
      if (scenario === "missing email") input.email = "missing@example.com";
      if (scenario === "inactive") repository.users[0].active = false;
      const verify = vi.spyOn(passwords, "verify");
      await expect(login.execute(input)).rejects.toEqual(new InvalidCredentialsError());
      expect(verify).toHaveBeenCalledExactlyOnceWith(
        scenario === "missing email" ? dummyHash : passwordHash, input.password,
      );
      expect(repository.sessions).toEqual([]);
    },
  );

  it("creates independent unpredictable tokens on repeated login", async () => {
    const first = await login.execute(credentials);
    const second = await login.execute(credentials);
    expect(second.token).not.toBe(first.token);
    expect(repository.sessions).toHaveLength(2);
    expect(repository.sessions[0].csrfToken).not.toBe(repository.sessions[1].csrfToken);
  });

  it("returns a minimal user, active memberships only and session-bound CSRF", async () => {
    const result = await login.execute(credentials);
    const userId = result.user.id;
    const base = { userId, createdAt: now, updatedAt: now, role: "OWNER" as const };
    repository.memberships.push(
      { ...base, id: randomUUID(), restaurantId: "b", active: true },
      { ...base, id: randomUUID(), restaurantId: "a", active: true },
      { ...base, id: randomUUID(), restaurantId: "c", active: false },
      { ...base, id: randomUUID(), restaurantId: "d", userId: randomUUID(), active: true },
    );
    const response = await getSession.execute(result.token);
    expect(response).toEqual({
      user: result.user,
      memberships: [{ restaurantId: "a", role: "OWNER" }, { restaurantId: "b", role: "OWNER" }],
      csrfToken: repository.sessions[0].csrfToken,
    });
  });

  it("returns [] with no memberships and touches activity without extending expiry", async () => {
    const result = await login.execute(credentials);
    const expiresAt = repository.sessions[0].expiresAt;
    now = new Date(now.getTime() + 60_000);
    expect((await getSession.execute(result.token)).memberships).toEqual([]);
    expect(repository.sessions[0].lastActivityAt).toEqual(now);
    expect(repository.sessions[0].expiresAt).toEqual(expiresAt);
  });

  it.each(["expired", "idle", "revoked", "inactive", "missing user"] as const)(
    "rejects %s without changing activity", async (scenario) => {
      const result = await login.execute(credentials);
      const session = repository.sessions[0];
      const originalActivity = session.lastActivityAt;
      if (scenario === "expired") session.expiresAt = now;
      if (scenario === "idle") now = new Date(now.getTime() + idle);
      if (scenario === "revoked") session.revokedAt = now;
      if (scenario === "inactive") repository.users[0].active = false;
      if (scenario === "missing user") repository.users = [];
      await expect(getSession.execute(result.token)).rejects.toEqual(new UnauthenticatedError());
      expect(session.lastActivityAt).toEqual(originalActivity);
    },
  );

  it.each([undefined, "bad", "x".repeat(43)])("rejects unknown/malformed token %s", async (token) => {
    await expect(validate.execute(token)).rejects.toEqual(new UnauthenticatedError());
  });

  it("rejects a session revoked between lookup and activity update", async () => {
    const result = await login.execute(credentials);
    const originalTouch = repository.touchSessionIfValid.bind(repository);
    vi.spyOn(repository, "touchSessionIfValid").mockImplementation(async (...args) => {
      await repository.revokeSession(repository.sessions[0].id, now);
      return originalTouch(...args);
    });
    await expect(validate.execute(result.token)).rejects.toEqual(new UnauthenticatedError());
    expect(repository.sessions[0].revokedAt).toEqual(now);
  });

  it.each([undefined, "bad", "x".repeat(43)])("rejects invalid CSRF without revocation or touch", async (csrf) => {
    const result = await login.execute(credentials);
    const originalActivity = repository.sessions[0].lastActivityAt;
    now = new Date(now.getTime() + 60_000);
    await expect(logout.execute(result.token, csrf)).rejects.toEqual(new InvalidCsrfError());
    expect(repository.sessions[0].revokedAt).toBeNull();
    expect(repository.sessions[0].lastActivityAt).toEqual(originalActivity);
  });

  it("revokes on logout and rejects calls without a valid session", async () => {
    const result = await login.execute(credentials);
    await logout.execute(result.token, repository.sessions[0].csrfToken);
    expect(repository.sessions[0].revokedAt).toEqual(now);
    await expect(validate.execute(result.token)).rejects.toEqual(new UnauthenticatedError());
    await expect(logout.execute(result.token, undefined)).rejects.toEqual(new UnauthenticatedError());
    await expect(logout.execute(undefined, undefined)).rejects.toEqual(new UnauthenticatedError());
  });
});
