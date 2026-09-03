import { describe, expect, it } from "vitest";
import { customPeriod, formatMoney, presetPeriod } from "./period";

describe("Dashboard period and formatting", () => {
  it.each([[0, "R$ 0,00"], [1, "R$ 0,01"], [123450, "R$ 1.234,50"], [61725, "R$ 617,25"]] as const)("formats %s cents without losing precision", (cents, expected) => {
    expect(formatMoney(cents).replace(/\u00a0/g, " ")).toBe(expected);
  });
  it("today begins at local midnight and ends at the captured current instant", () => {
    const now = new Date(2026, 8, 3, 14, 25, 33);
    expect(presetPeriod("today", now)).toEqual({ startsAt: new Date(2026, 8, 3).toISOString(), endsAt: now.toISOString() });
  });
  it("crosses month boundaries using calendar days", () => {
    const now = new Date(2026, 8, 3, 14);
    expect(presetPeriod("7days", now).startsAt).toBe(new Date(2026, 7, 28).toISOString());
    expect(presetPeriod("30days", now).startsAt).toBe(new Date(2026, 7, 5).toISOString());
  });
  it("custom ranges include the final local calendar day", () => {
    expect(customPeriod("2026-09-03", "2026-09-03")).toEqual({ startsAt: new Date(2026, 8, 3).toISOString(), endsAt: new Date(2026, 8, 3, 23, 59, 59, 999).toISOString() });
  });
  it.each([["", "2026-09-03"], ["2026-02-30", "2026-09-03"], ["2026-09-04", "2026-09-03"]])("rejects invalid custom range %s/%s", (start, end) => {
    expect(() => customPeriod(start, end)).toThrow();
  });
});
