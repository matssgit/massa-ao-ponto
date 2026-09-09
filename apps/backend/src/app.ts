import cookie from "@fastify/cookie";
import fastify, { LogController, type FastifyInstance } from "fastify";
import { registerCors } from "./http/cors.js";
import { errorHandler } from "./http/error-handler.js";
import { registerHealthRoutes, type ReadinessCheck } from "./http/health.js";
import { restaurantsRoutes } from "./http/routes.js";
import { readAuthConfig } from "./modules/auth/auth-config.js";
import { registerAuthorization } from "./modules/auth/authorization.js";
import { authRoutes } from "./modules/auth/routes.js";
import { publicReservationRoutes } from "./modules/public-reservations/routes.js";

interface ApplicationOptions {
  trustProxy: false | number;
  logger?: boolean;
  readinessCheck?: ReadinessCheck;
}

export function createApplication(options: ApplicationOptions): FastifyInstance {
  const app = fastify({
    trustProxy: options.trustProxy,
    logger: options.logger ?? false,
    logController: new LogController({ disableRequestLogging: true }),
  });

  app.setErrorHandler(errorHandler);
  app.register(async (scope) => {
    await registerCors(scope, readAuthConfig());
    await scope.register(cookie);
    registerAuthorization(scope);
    registerHealthRoutes(scope, options.readinessCheck);
    scope.register(authRoutes);
    scope.register(publicReservationRoutes);
    scope.register(restaurantsRoutes);
  });

  return app;
}
