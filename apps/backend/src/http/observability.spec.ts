import fastify, { LogController, type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { errorHandler } from "./error-handler.js";
import { registerHealthRoutes } from "./health.js";
import {
  createLoggerOptions,
  createRequestId,
  registerRequestObservability,
} from "./observability.js";

interface LogRecord {
  level: number;
  requestId?: string;
  method?: string;
  route?: string;
  statusCode?: number;
  msg?: string;
}

function createLoggedApplication() {
  const lines: string[] = [];
  const application = fastify({
    logger: createLoggerOptions("trace", {
      write(message) {
        lines.push(message);
      },
    }),
    genReqId: createRequestId,
    logController: new LogController({ disableRequestLogging: true }),
  });
  registerRequestObservability(application);
  application.setErrorHandler(errorHandler);

  return {
    application,
    lines,
    records: () => lines.map((line) => JSON.parse(line) as LogRecord),
  };
}

describe("HTTP observability", () => {
  const applications: FastifyInstance[] = [];

  afterEach(async () => {
    await Promise.all(applications.map((application) => application.close()));
    applications.length = 0;
  });

  it("generates and returns a request ID without trusting a client-supplied value", async () => {
    const { application, records } = createLoggedApplication();
    applications.push(application);
    application.get("/example", async () => ({ ok: true }));

    const response = await application.inject({
      url: "/example",
      headers: { "x-request-id": "client-controlled-request-id" },
    });

    const requestId = response.headers["x-request-id"];
    expect(requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(requestId).not.toBe("client-controlled-request-id");
    expect(records()).toContainEqual(expect.objectContaining({
      requestId,
      method: "GET",
      route: "/example",
      statusCode: 200,
    }));
  });

  it("logs public token routes by template without persisting raw tokens", async () => {
    const { application, lines } = createLoggedApplication();
    applications.push(application);
    application.get("/public/reservations/:token", async () => ({ ok: true }));
    application.get("/public/orders/:token", async () => ({ ok: true }));

    await application.inject({ url: "/public/reservations/reservation-secret-token" });
    await application.inject({ url: "/public/orders/order-secret-token" });

    const output = lines.join("");
    expect(output).toContain("/public/reservations/:token");
    expect(output).toContain("/public/orders/:token");
    expect(output).not.toContain("reservation-secret-token");
    expect(output).not.toContain("order-secret-token");
  });

  it("redacts sensitive headers and explicit secret fields", async () => {
    const { application, lines } = createLoggedApplication();
    applications.push(application);
    application.post("/redaction", async (request, reply) => {
      reply.header("Set-Cookie", "session-cookie-secret");
      request.log.info({
        headers: request.headers,
        responseHeaders: reply.getHeaders(),
        password: "password-secret",
        token: "token-secret",
      }, "Redaction check.");
      return { ok: true };
    });

    await application.inject({
      method: "POST",
      url: "/redaction",
      headers: {
        authorization: "Bearer authorization-secret",
        cookie: "session=cookie-secret",
        "x-csrf-token": "csrf-secret",
      },
    });

    const output = lines.join("");
    expect(output).toContain("[Redacted]");
    expect(output).not.toMatch(/authorization-secret|cookie-secret|csrf-secret|password-secret|token-secret/);
  });

  it("correlates unexpected errors while keeping auth secrets out of logs", async () => {
    const { application, lines, records } = createLoggedApplication();
    applications.push(application);
    application.get("/boom", async () => {
      throw new Error("diagnostic failure");
    });
    application.post("/auth/login", async () => {
      throw new Error("password-secret invitation-token-secret");
    });

    const failure = await application.inject({ url: "/boom" });
    const authFailure = await application.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "person@example.com", password: "password-secret" },
    });

    expect(failure.statusCode).toBe(500);
    expect(authFailure.statusCode).toBe(500);
    expect(records()).toContainEqual(expect.objectContaining({
      level: 50,
      requestId: failure.headers["x-request-id"],
      method: "GET",
      route: "/boom",
    }));
    expect(lines.join("")).not.toMatch(/password-secret|invitation-token-secret/);
  });

  it("suppresses successful probe access logs but signals readiness failure", async () => {
    const { application, lines, records } = createLoggedApplication();
    applications.push(application);
    registerHealthRoutes(application, async () => {
      throw new Error("postgresql://secret@database/internal");
    });

    const health = await application.inject({ url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(lines).toHaveLength(0);

    const readiness = await application.inject({ url: "/ready" });
    expect(readiness.statusCode).toBe(503);
    expect(records()).toContainEqual(expect.objectContaining({
      level: 40,
      requestId: readiness.headers["x-request-id"],
      method: "GET",
      route: "/ready",
      msg: "Database readiness check failed.",
    }));
    expect(lines.join("")).not.toContain("postgresql://secret@database/internal");
  });
});
