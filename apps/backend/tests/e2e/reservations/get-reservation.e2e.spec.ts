import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";
import {
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

describe("Get Reservation (E2E)", () => {
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
    const restaurantRes = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Restaurante Teste",
        address: "Rua",
        phone: "11",
        timezone: "UTC",
      },
    });
    const restaurant = restaurantRes.json();

    const tableRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 1, capacity: 4, type: "table" },
    });
    const table = tableRes.json();

    return { restaurant, table };
  }

  it("deve retornar 200 com os dados corretos de uma reserva existente", async () => {
    const { restaurant, table } = await setupBase();
    const otherRestaurantResponse = await app.inject({
      method: "POST",
      url: "/restaurants",
      payload: {
        name: "Outro Restaurante",
        address: "Rua",
        phone: "22",
        timezone: "UTC",
      },
    });
    const otherRestaurant = otherRestaurantResponse.json();

    const createRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "João", phone: "11999999999" },
        people: 2,
        startsAt: "2026-08-20T19:00:00Z",
        endsAt: "2026-08-20T21:00:00Z",
      },
    });
    const createdReservation = createRes.json();

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations/${createdReservation.id}`,
    });

    expect(response.statusCode).toBe(200);
    const fetchedReservation = response.json();
    expect(fetchedReservation.id).toBe(createdReservation.id);
    expect(fetchedReservation.status).toBe("SCHEDULED");

    const crossTenantResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${otherRestaurant.id}/reservations/${createdReservation.id}`,
    });
    expect(crossTenantResponse.statusCode).toBe(404);

    const oldRouteResponse = await app.inject({
      method: "GET",
      url: `/reservations/${createdReservation.id}`,
    });
    expect(oldRouteResponse.statusCode).toBe(404);
  });

  it("deve retornar 404 ao buscar uma reserva inexistente", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/reservations/${randomUUID()}`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("deve retornar 400 ao buscar utilizando um UUID inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/reservations/invalid-uuid`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("deve recuperar a reserva independentemente de seu status (ex: CANCELLED)", async () => {
    const { restaurant, table } = await setupBase();
    const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();

    const createRes = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Maria", phone: "11988888888" },
        people: 2,
        startsAt,
        endsAt,
      },
    });
    const createdReservation = createRes.json();

    const cancelResponse = await app.inject({
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${createdReservation.id}/cancel`,
    });
    expect(cancelResponse.statusCode).toBe(200);

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations/${createdReservation.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("CANCELLED");
  });
});
