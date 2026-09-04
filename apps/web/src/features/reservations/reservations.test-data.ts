import type { ReservationListItem } from "./reservations-service";

export const restaurantA = "11111111-1111-4111-8111-111111111111";
export const restaurantB = "22222222-2222-4222-8222-222222222222";
export const reservationId = "33333333-3333-4333-8333-333333333333";
export const tableId = "44444444-4444-4444-8444-444444444444";
export const customerId = "55555555-5555-4555-8555-555555555555";
export const createdAt = "2026-09-03T12:00:00.000Z";
export const startsAt = "2099-09-10T21:00:00.000Z";
export const endsAt = "2099-09-10T23:00:00.000Z";

export function reservationItem(): ReservationListItem {
  return {
    reservation: { id: reservationId, restaurantId: restaurantA, tableId, customerId, status: "SCHEDULED", people: 3, startsAt, endsAt, observation: "Aniversário" },
    customer: { id: customerId, name: "Ana Silva", phone: "11912345678", email: "ana@example.com" },
    table: { id: tableId, restaurantId: restaurantA, number: "12", capacity: 4, type: "INTERNA", active: true, createdAt, updatedAt: createdAt },
  };
}
