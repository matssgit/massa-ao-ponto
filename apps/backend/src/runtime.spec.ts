import { describe, expect, it, vi } from "vitest";
import { createGracefulShutdown } from "./runtime.js";

describe("createGracefulShutdown", () => {
  it("closes HTTP before the database and remains idempotent", async () => {
    const order: string[] = [];
    const closeHttp = vi.fn(async () => { order.push("http"); });
    const closeDatabase = vi.fn(async () => { order.push("database"); });
    const shutdown = createGracefulShutdown({ closeHttp, closeDatabase });

    await Promise.all([shutdown(), shutdown()]);

    expect(order).toEqual(["http", "database"]);
    expect(closeHttp).toHaveBeenCalledOnce();
    expect(closeDatabase).toHaveBeenCalledOnce();
  });

  it("still closes the database when HTTP shutdown fails", async () => {
    const closeDatabase = vi.fn(async () => undefined);
    const shutdown = createGracefulShutdown({
      closeHttp: async () => { throw new Error("HTTP close failed"); },
      closeDatabase,
    });

    await expect(shutdown()).rejects.toThrow("Runtime shutdown failed.");
    expect(closeDatabase).toHaveBeenCalledOnce();
  });
});
