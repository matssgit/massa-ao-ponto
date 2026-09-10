import type { FastifyInstance } from "fastify";
import { checkDatabaseConnection } from "../db/index.js";

export type ReadinessCheck = () => Promise<void>;

export function registerHealthRoutes(
  app: FastifyInstance,
  readinessCheck: ReadinessCheck = checkDatabaseConnection,
): void {
  app.get("/health", { config: { access: "public" } }, async () => ({ status: "ok" }));

  app.get("/ready", { config: { access: "public" } }, async (request, reply) => {
    try {
      await readinessCheck();
      return { status: "ready" };
    } catch {
      request.log.warn({
        requestId: request.id,
        method: request.method,
        route: request.routeOptions.url,
      }, "Database readiness check failed.");
      return reply.status(503).send({ status: "unavailable" });
    }
  });
}
