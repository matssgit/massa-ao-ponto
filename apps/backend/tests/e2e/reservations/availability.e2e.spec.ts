import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
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
import { randomUUID } from "node:crypto";

describe("Availability (E2E)", () => {
  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
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

    const table1Res = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 1, capacity: 2, type: "table" },
    });

    const table2Res = await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/tables`,
      payload: { number: 2, capacity: 4, type: "table" },
    });

    return { restaurant, table1: table1Res.json(), table2: table2Res.json() };
  }

  it("should return 200 with available tables", async () => {
    const { restaurant } = await setupBase();
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/availability?startsAt=2026-08-20T19:00:00Z&endsAt=2026-08-20T21:00:00Z`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(2);
  });

  it("should exclude table occupied by SCHEDULED reservation", async () => {
    const { restaurant, table1, table2 } = await setupBase();

    await app.inject({
      method: "POST",
      url: `/restaurants/${restaurant.id}/reservations`,
      payload: {
        tableId: table1.id,
        customer: { name: "João", phone: "11999999999" }, // <- Nome corrigido aqui
        people: 2,
        startsAt: "2026-08-20T19:00:00Z",
        endsAt: "2026-08-20T21:00:00Z",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/availability?startsAt=2026-08-20T20:00:00Z&endsAt=2026-08-20T22:00:00Z`,
    });

    const available = response.json();
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe(table2.id);
  });

  it("should filter by people capacity", async () => {
    const { restaurant, table2 } = await setupBase();
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/availability?startsAt=2026-08-20T19:00:00Z&endsAt=2026-08-20T21:00:00Z&people=3`,
    });
    const available = response.json();
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe(table2.id);
  });

  it("should return empty array if no tables fit the capacity", async () => {
    const { restaurant } = await setupBase();
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/availability?startsAt=2026-08-20T19:00:00Z&endsAt=2026-08-20T21:00:00Z&people=10`,
    });
    expect(response.json()).toEqual([]);
  });

  it("should return 400 for inverted date range", async () => {
    const { restaurant } = await setupBase();
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurant.id}/availability?startsAt=2026-08-20T21:00:00Z&endsAt=2026-08-20T19:00:00Z`,
    });
    expect(response.statusCode).toBe(400);
  });

  it("should return 404 for non-existent restaurant", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/availability?startsAt=2026-08-20T19:00:00Z&endsAt=2026-08-20T21:00:00Z`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("should return 400 for invalid UUID", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/invalid/availability?startsAt=2026-08-20T19:00:00Z&endsAt=2026-08-20T21:00:00Z`,
    });
    expect(response.statusCode).toBe(400);
  });
});
