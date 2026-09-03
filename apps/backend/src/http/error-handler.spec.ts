import { afterEach, describe, expect, it, vi } from "vitest";
import fastify, { FastifyInstance } from "fastify";
import { z } from "zod";

import { InvalidPeriodFilterError } from "../modules/orders/errors/invalid-period-filter-error.js";
import { errorHandler } from "./error-handler.js";

describe("errorHandler", () => {
  let testApp: FastifyInstance | undefined;

  afterEach(async () => {
    await testApp?.close();
    vi.restoreAllMocks();
  });

  it("retorna código estável e issues para erro de validação", async () => {
    testApp = fastify();
    testApp.setErrorHandler(errorHandler);
    testApp.get("/validation", async () => {
      z.object({ limit: z.number().min(1) }).parse({ limit: 0 });
    });

    const response = await testApp.inject({ method: "GET", url: "/validation" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Validation error.",
      issues: expect.any(Array),
    });
  });

  it("não registra nem devolve credenciais em falhas inesperadas de auth", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    testApp = fastify();
    testApp.setErrorHandler(errorHandler);
    testApp.post("/auth/login", async () => {
      throw new Error("query with sensitive-password-and-token");
    });
    const response = await testApp.inject({ method: "POST", url: "/auth/login" });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      code: "INTERNAL_SERVER_ERROR", message: "Internal server error.",
    });
    expect(log).toHaveBeenCalledExactlyOnceWith("Authentication request failed.");
    expect(response.body).not.toContain("sensitive-password-and-token");
  });

  it("retorna código estável sem alterar a mensagem de domínio", async () => {
    testApp = fastify();
    testApp.setErrorHandler(errorHandler);
    testApp.get("/domain", async () => {
      throw new InvalidPeriodFilterError();
    });

    const response = await testApp.inject({ method: "GET", url: "/domain" });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: "INVALID_PERIOD_FILTER",
      message: "A data de início deve ser anterior ou igual à data de fim.",
    });
  });
});
