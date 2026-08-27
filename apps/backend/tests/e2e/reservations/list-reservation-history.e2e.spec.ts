import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
  productCategories,
  products,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

describe("List Reservation History (E2E)", () => {
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
    await db.delete(tables);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(customers);
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

    return { restaurant, table: tableRes.json() };
  }

  it("deve retornar 200 com evento inicial de criação", async () => {
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
    const reservation = createRes.json();

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/history`,
    });

    expect(response.statusCode).toBe(200);
    const history = response.json();
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("CREATED");
    expect(history[0].newStatus).toBe("SCHEDULED");

    const crossTenantResponse = await app.inject({
      method: "GET",
      url: `/restaurants/${otherRestaurant.id}/reservations/${reservation.id}/history`,
    });
    expect(crossTenantResponse.statusCode).toBe(404);
    expect(crossTenantResponse.json()).not.toBeInstanceOf(Array);

    const oldRouteResponse = await app.inject({
      method: "GET",
      url: `/reservations/${reservation.id}/history`,
    });
    expect(oldRouteResponse.statusCode).toBe(404);
  });

  it("deve retornar eventos ordenados após alteração de status", async () => {
    const { restaurant, table } = await setupBase();
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
    const reservation = createRes.json();

    await app.inject({
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/status`,
      payload: { status: "CONFIRMED" },
    });

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/history`,
    });

    expect(response.statusCode).toBe(200);
    const history = response.json();
    expect(history).toHaveLength(2);
    expect(history[0].action).toBe("CREATED");
    expect(history[1].action).toBe("STATUS_CHANGED");
    expect(history[1].newStatus).toBe("CONFIRMED");
  });

  it("deve registrar sequência correta após cancelamento", async () => {
    const { restaurant, table } = await setupBase();
    const startsAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();
    const endsAt = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString();

    const createRes = await app.inject({
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
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/cancel`,
    });

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations/${reservation.id}/history`,
    });

    const history = response.json();
    expect(history).toHaveLength(2);
    expect(history[1].action).toBe("STATUS_CHANGED");
    expect(history[1].newStatus).toBe("CANCELLED");
  });

  it("deve isolar histórico garantindo que eventos de outras reservas não apareçam", async () => {
    const { restaurant, table } = await setupBase();

    const res1 = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Alice", phone: "11999999999" },
        people: 2,
        startsAt: "2026-08-20T19:00:00Z",
        endsAt: "2026-08-20T21:00:00Z",
      },
    });
    const res2 = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table.id,
        customer: { name: "Bruno", phone: "11988888888" },
        people: 2,
        startsAt: "2026-08-21T19:00:00Z",
        endsAt: "2026-08-21T21:00:00Z",
      },
    });

    await app.inject({
      method: "PATCH",
      url: `/restaurants/${restaurant.id}/reservations/${res1.json().id}/status`,
      payload: { status: "CONFIRMED" },
    });

    const historyRes2 = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/reservations/${res2.json().id}/history`,
    });
    expect(historyRes2.json()).toHaveLength(1);
    expect(historyRes2.json()[0].reservationId).toBe(res2.json().id);
  });

  it("deve retornar 404 para reserva inexistente", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/reservations/${randomUUID()}/history`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("deve retornar 400 para UUID inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/reservations/invalid-id/history`,
    });
    expect(response.statusCode).toBe(400);
  });
});
