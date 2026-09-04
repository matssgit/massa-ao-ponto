import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../lib/api-client";
import { availableReservationActions } from "./reservation-actions";
import { cancellationWindow, overlapPeriod } from "./reservation-labels";
import { ReservationsService, reservationSchema } from "./reservations-service";
import { reservationId, reservationItem, restaurantA } from "./reservations.test-data";

describe("Reservation temporal and API contracts", () => {
  it("maps a local date range to a semi-open interval ending next midnight", () => {
    const period = overlapPeriod("2026-09-01", "2026-09-03");
    const start = new Date(period.startsAt!); const end = new Date(period.endsAt!);
    expect([start.getDate(), start.getHours()]).toEqual([1, 0]);
    expect([end.getDate(), end.getHours()]).toEqual([4, 0]);
  });

  it("allows either period boundary and rejects invalid or reversed dates", () => {
    expect(overlapPeriod("2026-09-01", "").endsAt).toBeUndefined();
    expect(overlapPeriod("", "2026-09-03").startsAt).toBeUndefined();
    expect(() => overlapPeriod("2026-09-04", "2026-09-03")).toThrow();
    expect(() => overlapPeriod("2026-02-30", "")).toThrow();
  });

  it("matches the server cancellation boundary: strictly more than two hours", () => {
    const now = new Date("2026-09-03T12:00:00.000Z");
    expect(cancellationWindow("2026-09-03T14:00:00.001Z", now).open).toBe(true);
    expect(cancellationWindow("2026-09-03T14:00:00.000Z", now).open).toBe(false);
    expect(cancellationWindow("2026-09-03T13:59:59.999Z", now).open).toBe(false);
  });

  it.each([
    ["SCHEDULED", ["CONFIRMED", "cancel"]], ["CONFIRMED", ["FINISHED", "NO_SHOW", "cancel"]],
    ["CANCELLED", []], ["FINISHED", []], ["NO_SHOW", []],
  ] as const)("derives UX actions for %s without exposing generic CANCELLED", (status, expected) => {
    const reservation = { ...reservationItem().reservation, status };
    const actions = availableReservationActions(reservation, new Date("2026-09-03T12:00:00.000Z"));
    expect(actions.map(({ action }) => action.kind === "status" ? action.status : action.kind)).toEqual(expected);
  });

  it("validates mutation responses before the UI claims success", async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({}));
    const client = new ApiClient("https://api.example.com", transport); client.setCsrfToken("test");
    const service = new ReservationsService(client);
    await expect(service.mutate(restaurantA, reservationId, { kind: "status", status: "CONFIRMED" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
    await expect(service.mutate(restaurantA, reservationId, { kind: "cancel" })).rejects.toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("rejects invalid reservation intervals/status/nullability returned by the API", () => {
    const reservation = reservationItem().reservation;
    expect(reservationSchema.safeParse({ ...reservation, status: "UNKNOWN" }).success).toBe(false);
    expect(reservationSchema.safeParse({ ...reservation, startsAt: "invalid" }).success).toBe(false);
    expect(reservationSchema.safeParse({ ...reservation, observation: undefined }).success).toBe(false);
  });
});
