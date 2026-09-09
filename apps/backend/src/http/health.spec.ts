import { afterEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "../app.js";

describe("runtime probes", () => {
  const applications: ReturnType<typeof createApplication>[] = [];

  afterEach(async () => {
    await Promise.all(applications.map((application) => application.close()));
    applications.length = 0;
  });

  it("exposes health publicly without checking the database", async () => {
    const readinessCheck = vi.fn(async () => undefined);
    const application = createApplication({ trustProxy: false, readinessCheck });
    applications.push(application);

    const response = await application.inject({ url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(readinessCheck).not.toHaveBeenCalled();
  });

  it("reports readiness publicly when the database check succeeds", async () => {
    const application = createApplication({ trustProxy: false, readinessCheck: async () => undefined });
    applications.push(application);

    const response = await application.inject({ url: "/ready" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready" });
  });

  it("returns a sanitized 503 when the database check fails", async () => {
    const application = createApplication({
      trustProxy: false,
      readinessCheck: async () => { throw new Error("postgresql://secret@database/internal"); },
    });
    applications.push(application);

    const response = await application.inject({ url: "/ready" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "unavailable" });
    expect(response.body).not.toContain("secret");
  });
});
