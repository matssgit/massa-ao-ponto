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

describe("Dashboard - Sales Summary (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

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

  async function createOrder(
    restaurantId: string,
    customerId: string,
    status: string,
    paymentStatus: string,
    total: number,
    dateOffsetHours = 0,
  ) {
    const date = new Date();
    date.setHours(date.getHours() + dateOffsetHours);

    await db.insert(orders).values({
      restaurantId,
      customerId,
      type: "DELIVERY",
      status: status as any,
      paymentStatus: paymentStatus as any,
      subtotal: total,
      deliveryFee: 0,
      total,
      customerName: "A",
      customerPhone: "1",
      createdAt: date,
      updatedAt: date,
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });
  }

  describe("GET /restaurants/:restaurantId/dashboard/sales-summary", () => {
    it("deve realizar as agregações diretamente no PostgreSQL e retornar o sumário", async () => {
      const [rest] = await db
        .insert(restaurants)
        .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
        .returning();
      const [cust] = await db
        .insert(customers)
        .values({ name: "C1", phone: "1" })
        .returning();

      await createOrder(rest.id, cust.id, "DELIVERED", "PAID", 5000); // Valido pago
      await createOrder(rest.id, cust.id, "PENDING", "PENDING", 2000); // Valido pendente
      await createOrder(rest.id, cust.id, "CANCELLED", "PAID", 9000); // Cancelado (ignorado na receita e no ticket médio)

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${rest.id}/dashboard/sales-summary`,
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.orders.total).toBe(3);
      expect(data.orders.delivered).toBe(1);
      expect(data.orders.cancelled).toBe(1);
      expect(data.orders.pending).toBe(1);

      expect(data.orders.paid).toBe(1);
      expect(data.revenue).toBe(5000);
      expect(data.averageTicket).toBe(5000);
    });

    it("deve filtrar corretamente pelo período", async () => {
      const [rest] = await db
        .insert(restaurants)
        .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
        .returning();
      const [cust] = await db
        .insert(customers)
        .values({ name: "C1", phone: "1" })
        .returning();

      await createOrder(rest.id, cust.id, "DELIVERED", "PAID", 5000, -48); // Há 2 dias
      await createOrder(rest.id, cust.id, "DELIVERED", "PAID", 3000, 0); // Hoje

      const startsAt = new Date();
      startsAt.setHours(startsAt.getHours() - 24); // Desde ontem

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${rest.id}/dashboard/sales-summary?startsAt=${startsAt.toISOString()}`,
      });

      expect(response.json().orders.total).toBe(1);
      expect(response.json().revenue).toBe(3000);
    });

    it("deve isolar métricas entre restaurantes", async () => {
      const [r1] = await db
        .insert(restaurants)
        .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
        .returning();
      const [r2] = await db
        .insert(restaurants)
        .values({ name: "R2", address: "", phone: "", timezone: "UTC" })
        .returning();
      const [cust] = await db
        .insert(customers)
        .values({ name: "C1", phone: "1" })
        .returning();

      await createOrder(r1.id, cust.id, "DELIVERED", "PAID", 5000);

      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${r2.id}/dashboard/sales-summary`,
      });

      expect(response.json().orders.total).toBe(0);
      expect(response.json().revenue).toBe(0);
    });

    it("deve retornar 400 para datas invertidas", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/restaurants/${randomUUID()}/dashboard/sales-summary?startsAt=2026-08-25&endsAt=2026-08-24`,
      });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({
        code: "INVALID_PERIOD_FILTER",
        message: "A data de início deve ser anterior ou igual à data de fim.",
      });
    });
  });
});
