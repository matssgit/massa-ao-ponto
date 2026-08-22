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

describe("Customers (E2E)", () => {
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

    return { restaurant, table: tableRes.json() };
  }

  describe("GET /customers/:customerId", () => {
    it("deve retornar 200 para customer existente", async () => {
      const { restaurant, table } = await setupBase();

      const createRes = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload: {
          tableId: table.id,
          customer: { name: "João Silva", phone: "11999999999" },
          people: 2,
          startsAt: "2026-08-20T19:00:00Z",
          endsAt: "2026-08-20T21:00:00Z",
        },
      });

      const customerId = createRes.json().customerId;

      const response = await app.inject({
        method: "GET",
        url: `/customers/${customerId}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(customerId);
      expect(response.json().name).toBe("João Silva");
    });

    it("deve retornar 404 para customer inexistente", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/customers/${randomUUID()}`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 400 para UUID inválido", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/customers/invalid-uuid",
      });
      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /customers/:customerId/reservations", () => {
    it("deve retornar 200 com array vazio quando customer não possui reservas", async () => {
      const { restaurant, table } = await setupBase();

      const createRes = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload: {
          tableId: table.id,
          customer: { name: "Maria Silva", phone: "11988888888" },
          people: 2,
          startsAt: "2026-08-20T19:00:00Z",
          endsAt: "2026-08-20T21:00:00Z",
        },
      });

      const customerId = createRes.json().customerId;

      await db.delete(reservationHistory);
      await db
        .delete(reservations)
        .where(eq(reservations.customerId, customerId));

      const response = await app.inject({
        method: "GET",
        url: `/customers/${customerId}/reservations`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it("deve retornar reservas ordenadas e respeitando isolamento", async () => {
      const { restaurant, table } = await setupBase();

      const res1 = await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload: {
          tableId: table.id,
          customer: { name: "Carlos Lima", phone: "11977777777" },
          people: 2,
          startsAt: "2026-08-22T19:00:00Z",
          endsAt: "2026-08-22T21:00:00Z",
        },
      });

      const customerId = res1.json().customerId;

      await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload: {
          tableId: table.id,
          customer: { name: "Carlos Lima", phone: "11977777777" },
          people: 2,
          startsAt: "2026-08-21T19:00:00Z",
          endsAt: "2026-08-21T21:00:00Z",
        },
      });

      await app.inject({
        method: "POST",
        url: `/restaurants/${restaurant.id}/reservations`,
        payload: {
          tableId: table.id,
          customer: { name: "Outro Cliente", phone: "11966666666" },
          people: 2,
          startsAt: "2026-08-23T19:00:00Z",
          endsAt: "2026-08-23T21:00:00Z",
        },
      });

      const response = await app.inject({
        method: "GET",
        url: `/customers/${customerId}/reservations`,
      });

      expect(response.statusCode).toBe(200);
      const items = response.json();
      expect(items).toHaveLength(2);
      expect(items[0].startsAt).toContain("2026-08-21");
      expect(items[1].startsAt).toContain("2026-08-22");
    });

    it("deve retornar 404 para customer inexistente", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/customers/${randomUUID()}/reservations`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 400 para UUID inválido", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/customers/invalid-uuid/reservations",
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
