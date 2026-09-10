import { describe, expect, it, vi } from "vitest";
import { waitForDatabaseQuery } from "./readiness.js";

describe("waitForDatabaseQuery", () => {
  it("finishes without cancellation when the query succeeds", async () => {
    const cancel = vi.fn();
    const query = Object.assign(Promise.resolve([{ value: 1 }]), { cancel });

    await expect(waitForDatabaseQuery(query, 100)).resolves.toBeUndefined();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("rejects and requests cancellation when readiness exceeds its timeout", async () => {
    const cancel = vi.fn();
    const query = Object.assign(new Promise<never>(() => undefined), { cancel });

    await expect(waitForDatabaseQuery(query, 5)).rejects.toThrow(
      "Database readiness check timed out.",
    );
    expect(cancel).toHaveBeenCalledOnce();
  });
});
