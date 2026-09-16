import { describe, expect, it } from "vitest";
import { isReservationWithinOperatingHours, isRestaurantOpenAt } from "./operating-hours.js";
import type { OperatingHour } from "./repositories/operating-hours-repository.js";

function day(dayOfWeek: number, opensAt = "11:00", closesAt = "23:00"): OperatingHour {
  return { id: crypto.randomUUID(), restaurantId: crypto.randomUUID(), dayOfWeek, active: true, opensAt, closesAt };
}

describe("Restaurant operating hours", () => {
  it("keeps Restaurants without a configured week unrestricted", () => {
    expect(isRestaurantOpenAt([], "America/Sao_Paulo", new Date("2026-09-15T15:00:00Z"))).toBe(true);
    expect(isReservationWithinOperatingHours([], "America/Sao_Paulo", new Date("2026-09-15T12:00:00Z"), new Date("2026-09-15T13:00:00Z"))).toBe(true);
  });

  it("applies OPEN and CLOSED before the configured week", () => {
    const instant = new Date("2026-09-15T15:00:00Z");
    const intervalEnd = new Date("2026-09-15T16:00:00Z");
    const closedWeek = [day(2, "02:00", "04:00")];
    expect(isRestaurantOpenAt(closedWeek, "America/Sao_Paulo", instant, "DEFAULT")).toBe(false);
    expect(isRestaurantOpenAt(closedWeek, "America/Sao_Paulo", instant, "OPEN")).toBe(true);
    expect(isRestaurantOpenAt([], "America/Sao_Paulo", instant, "CLOSED")).toBe(false);
    expect(isReservationWithinOperatingHours(closedWeek, "America/Sao_Paulo", instant, intervalEnd, "OPEN")).toBe(true);
    expect(isReservationWithinOperatingHours([], "America/Sao_Paulo", instant, intervalEnd, "CLOSED")).toBe(false);
  });

  it("evaluates the current instant in the Restaurant timezone", () => {
    const instant = new Date("2026-09-15T15:00:00Z");
    expect(isRestaurantOpenAt([day(2)], "America/Sao_Paulo", instant)).toBe(true);
    expect(isRestaurantOpenAt([day(3, "02:00", "04:00")], "Pacific/Auckland", instant)).toBe(true);
    expect(isRestaurantOpenAt([day(2, "13:00", "23:00")], "America/Sao_Paulo", instant)).toBe(false);
  });

  it("accepts only reservation intervals contained in one open local day", () => {
    const hours = [day(2, "10:00", "14:00")];
    expect(isReservationWithinOperatingHours(hours, "America/Sao_Paulo", new Date("2026-09-15T13:00:00Z"), new Date("2026-09-15T17:00:00Z"))).toBe(true);
    expect(isReservationWithinOperatingHours(hours, "America/Sao_Paulo", new Date("2026-09-15T12:59:00Z"), new Date("2026-09-15T14:00:00Z"))).toBe(false);
    expect(isReservationWithinOperatingHours(hours, "America/Sao_Paulo", new Date("2026-09-15T16:00:00Z"), new Date("2026-09-15T17:01:00Z"))).toBe(false);
    expect(isReservationWithinOperatingHours([day(2, "10:00", "23:59")], "America/Sao_Paulo", new Date("2026-09-16T02:30:00Z"), new Date("2026-09-16T03:30:00Z"))).toBe(false);
  });
});
