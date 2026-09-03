import { useTestAuth } from "../../helpers/auth.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const auth = useTestAuth(app);

describe("Cancel Reservation (E2E)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await db.delete(deliveryHistory);
    await db.delete(deliveries);
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(reservationHistory);
    await db.delete(reservations);
    await db.delete(customers);
    await db.delete(tables);
    await db.delete(restaurants);
  });

  async function setupBase() {
    const restaurant = await auth.createRestaurant({
        name: "Restaurante Teste",
        address: "Rua",
        phone: "11",
        timezone: "UTC",
      });

    const tableRes = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 1, capacity: 4, type: "table" },
    });
    const table = tableRes.json();

    return { restaurant, table };
  }

  it("deve cancelar com sucesso uma reserva distante (SCHEDULED) e liberar disponibilidade", async () => {
    const { restaurant, table } = await setupBase();
    const otherRestaurant = await auth.createRestaurant({
        name: "Outro Restaurante",
        address: "Rua",
        phone: "22",
        timezone: "UTC",
      });
    const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();

    const createRes = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt,
        endsAt,
      },
    });
    const reservation = createRes.json();

    const checkAvailabilityOccupied = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${restaurant.id}/availability?startsAt=${startsAt}&endsAt=${endsAt}`,
    });
    expect(checkAvailabilityOccupied.json()).toHaveLength(0);

    const bypassResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/status`,
      payload: { status: "CANCELLED" },
    });
    expect(bypassResponse.statusCode).toBe(409);

    const [preservedBeforeCancel] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservation.id));
    expect(preservedBeforeCancel.status).toBe("SCHEDULED");

    const historyBeforeCancel = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservation.id));
    expect(historyBeforeCancel).toHaveLength(1);

    const cancelRes = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/cancel`,
    });

    expect(cancelRes.statusCode).toBe(200);
    expect(cancelRes.json().status).toBe("CANCELLED");

    const checkAvailabilityFree = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${restaurant.id}/availability?startsAt=${startsAt}&endsAt=${endsAt}`,
    });
    expect(checkAvailabilityFree.json()).toHaveLength(1);
    expect(checkAvailabilityFree.json()[0].id).toBe(table.id);

    const history = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservation.id));
    expect(history).toHaveLength(2);
    expect(history[1].newStatus).toBe("CANCELLED");

    const crossTenantResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${otherRestaurant.id}/reservations/${reservation.id}/cancel`,
    });
    expect(crossTenantResponse.statusCode).toBe(404);

    const preservedHistory = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservation.id));
    expect(preservedHistory).toHaveLength(2);

    const oldRouteResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/reservations/${reservation.id}/cancel`,
    });
    expect(oldRouteResponse.statusCode).toBe(404);
  });

  it("deve bloquear cancelamento com menos de 2 horas (409)", async () => {
    const { restaurant, table } = await setupBase();
    const startsAt = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    const createRes = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt,
        endsAt,
      },
    });
    const reservation = createRes.json();

    const cancelRes = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/cancel`,
    });

    expect(cancelRes.statusCode).toBe(409);

    const bypassResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/status`,
      payload: { status: "CANCELLED" },
    });
    expect(bypassResponse.statusCode).toBe(409);

    const [preservedReservation] = await db
      .select()
      .from(reservations)
      .where(eq(reservations.id, reservation.id));
    expect(preservedReservation.status).toBe("SCHEDULED");

    const history = await db
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservation.id));
    expect(history).toHaveLength(1);
  });

  it("deve rejeitar cancelamento de reserva já cancelada (409)", async () => {
    const { restaurant, table } = await setupBase();
    const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();

    const createRes = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt,
        endsAt,
      },
    });
    const reservation = createRes.json();

    await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/cancel`,
    });

    const secondCancelRes = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/cancel`,
    });
    expect(secondCancelRes.statusCode).toBe(409);
  });

  it("deve retornar 404 para reserva inexistente", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${randomUUID()}/reservations/${randomUUID()}/cancel`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("deve retornar 400 para UUID inválido", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${(await auth.createRestaurant()).id}/reservations/invalid-id/cancel`,
    });
    expect(response.statusCode).toBe(400);
  });
});
