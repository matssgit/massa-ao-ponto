import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../../src/server.js";

describe("runtime probes (E2E)", () => {
  beforeAll(async () => { await app.ready(); });
  afterAll(async () => { await app.close(); });

  it("serves liveness without a session", async () => {
    const response = await app.inject({ url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
  });

  it("serves readiness after querying PostgreSQL without a session", async () => {
    const response = await app.inject({ url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready" });
  });
});
