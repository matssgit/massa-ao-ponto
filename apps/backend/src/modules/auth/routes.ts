import type { FastifyInstance } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { AuthRateLimitError } from "./errors/auth-errors.js";
import { readAuthConfig } from "./auth-config.js";
import { createAuthControllers } from "./controllers/auth-controllers.js";
import { assertTrustedAuthOrigin } from "./csrf.js";
import { Argon2PasswordHasher } from "./password-hasher.js";
import { DrizzleAuthRepository } from "./repositories/drizzle-auth-repository.js";
import { createSessionToken } from "./session-tokens.js";
import { GetSessionUseCase } from "./use-cases/get-session.use-case.js";
import { LoginUseCase } from "./use-cases/login.use-case.js";
import { LogoutUseCase } from "./use-cases/logout.use-case.js";
import { ValidateSessionUseCase } from "./use-cases/validate-session.use-case.js";

export async function authRoutes(app: FastifyInstance) {
  const config = readAuthConfig();
  await app.register(rateLimit, {
    global: false,
    hook: "onRequest",
    continueExceeding: false,
    skipOnError: false,
    errorResponseBuilder: () => new AuthRateLimitError(),
  });
  const repository = new DrizzleAuthRepository();
  const passwords = new Argon2PasswordHasher();
  const dummyPasswordHash = await passwords.hash(createSessionToken());
  const validate = new ValidateSessionUseCase(repository, config.idleTimeoutMs);
  const controllers = createAuthControllers(
    config,
    new LoginUseCase(repository, passwords, dummyPasswordHash, config.lifetimeMs),
    new GetSessionUseCase(repository, validate),
    new LogoutUseCase(repository, validate),
  );

  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.header("Pragma", "no-cache");
    if (request.routeOptions.url !== "/auth/login") return;
    // Protect login before a session exists; no origin inferred from an untrusted Host header.
    assertTrustedAuthOrigin(config, request.headers.origin, request.headers["x-auth-request"]);
  });

  app.post("/auth/login", {
    bodyLimit: 8192,
    config: { access: "auth-runtime", rateLimit: config.loginRateLimit },
  }, controllers.login);
  app.get("/auth/session", { config: { access: "auth-runtime" } }, controllers.session);
  app.post("/auth/logout", { bodyLimit: 8192, config: { access: "user" } }, controllers.logout);
}
