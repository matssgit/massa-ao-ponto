import type { FastifyInstance } from "fastify";
import { z } from "zod";
import "./auth-context.js";
import { readAuthConfig } from "./auth-config.js";
import { assertSessionCsrf, assertTrustedAuthOrigin } from "./csrf.js";
import { ForbiddenError } from "./errors/auth-errors.js";
import { DrizzleAuthRepository } from "./repositories/drizzle-auth-repository.js";
import { AuthorizeRestaurantUseCase } from "./use-cases/authorize-restaurant.use-case.js";
import { ValidateSessionUseCase } from "./use-cases/validate-session.use-case.js";

const tenantParams = z.object({ restaurantId: z.uuid() });

export function registerAuthorization(app: FastifyInstance): void {
  const config = readAuthConfig();
  const repository = new DrizzleAuthRepository();
  const validate = new ValidateSessionUseCase(repository, config.idleTimeoutMs);
  const authorize = new AuthorizeRestaurantUseCase(repository);
  app.decorateRequest("authenticatedUserId", null);
  app.decorateRequest("authContext", null);

  app.addHook("onRequest", async (request, reply) => {
    if (request.is404) return;
    reply.header("Cache-Control", "no-store");
    const access = request.routeOptions.config.access;
    // Only explicitly registered auth endpoints delegate validation to their own runtime.
    if (access === "auth-runtime") return;
    const { session, user } = await validate.execute(request.cookies[config.cookieName], false);
    request.authenticatedUserId = user.id;
    if (access === undefined || access === "disabled") throw new ForbiddenError();
    if (access === "tenant" || access === "owner") {
      const { restaurantId } = tenantParams.parse(request.params);
      request.authContext = await authorize.execute(user.id, restaurantId, access === "owner");
    }
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      assertTrustedAuthOrigin(config, request.headers.origin, request.headers["x-auth-request"]);
      assertSessionCsrf(session.csrfToken, request.headers["x-csrf-token"]);
    }
    await validate.touch(session);
  });
}
