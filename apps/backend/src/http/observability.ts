import { randomUUID } from "node:crypto";
import type {
  FastifyError,
  FastifyInstance,
  FastifyRequest,
  FastifyServerOptions,
} from "fastify";

export const logLevels = ["fatal", "error", "warn", "info", "debug", "trace"] as const;

export type LogLevel = (typeof logLevels)[number];

interface LogDestination {
  write(message: string): void;
}

export type StructuredLoggerOptions = Exclude<
  FastifyServerOptions["logger"],
  boolean | undefined
>;

const redactedLogPaths = [
  "req.headers.cookie",
  "req.headers.authorization",
  "req.headers['x-csrf-token']",
  "res.headers['set-cookie']",
  "headers.cookie",
  "headers.authorization",
  "headers['x-csrf-token']",
  "headers['set-cookie']",
  "responseHeaders['set-cookie']",
  "body.password",
  "body.token",
  "body.accessToken",
  "body.invitationToken",
  "password",
  "passwordHash",
  "token",
  "tokenHash",
  "accessToken",
  "sessionToken",
  "invitationToken",
] as const;

export function createLoggerOptions(
  level: LogLevel,
  stream?: LogDestination,
): StructuredLoggerOptions {
  return {
    level,
    redact: {
      paths: [...redactedLogPaths],
      censor: "[Redacted]",
    },
    ...(stream ? { stream } : {}),
  };
}

export function createRequestId(): string {
  return randomUUID();
}

function sanitizedRoute(request: FastifyRequest): string {
  return request.routeOptions.url ?? "unmatched";
}

function isProbeRoute(route: string): boolean {
  return route === "/health" || route === "/ready";
}

function hasSensitiveErrorContext(route: string): boolean {
  return route.includes(":token") ||
    route.startsWith("/auth/") ||
    route.includes("member-invitations/accept");
}

export function registerRequestObservability(app: FastifyInstance): void {
  app.addHook("onRequest", (request, reply, done) => {
    reply.header("X-Request-Id", request.id);
    done();
  });

  app.addHook("onResponse", (request, reply, done) => {
    const route = sanitizedRoute(request);
    if (!isProbeRoute(route) && reply.statusCode < 500) {
      request.log.info({
        requestId: request.id,
        method: request.method,
        route,
        statusCode: reply.statusCode,
        responseTimeMs: reply.elapsedTime,
        remoteAddress: request.ip,
      }, "Request completed.");
    }
    done();
  });
}

export function logUnexpectedRequestError(
  error: FastifyError,
  request: FastifyRequest,
): void {
  const route = sanitizedRoute(request);
  const context = {
    requestId: request.id,
    method: request.method,
    route,
    errorName: error.name,
    errorCode: error.code,
  };

  if (hasSensitiveErrorContext(route)) {
    request.log.error(context, "Unexpected request failure.");
    return;
  }

  request.log.error({ ...context, err: error }, "Unexpected request failure.");
}
