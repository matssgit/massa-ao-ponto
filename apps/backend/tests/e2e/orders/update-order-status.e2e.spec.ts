import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  orderHistory,
  orderItems,
  orders,
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("Update Order Status (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(customers);
    await db.delete(restaurants);
  });

  async function createOrder() {
    const [restaurant] = await db
      .insert(restaurants)
      .values({ name: "Rest", address: "Rua", phone: "1", timezone: "UTC" })
      .returning();
    const [customer] = await db
      .insert(customers)
      .values({ name: "Cli", phone: "2" })
      .returning();
    const [order] = await db
      .insert(orders)
      .values({
        restaurantId: restaurant.id,
        customerId: customer.id,
        type: "DELIVERY",
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal: 10,
        deliveryFee: 0,
        total: 10,
        customerName: "A",
        customerPhone: "1",
      })
      .returning();
    return order;
  }

  describe("PATCH /orders/:orderId/status", () => {
    it("deve transitar o status de PENDING para CONFIRMED e registrar history (204)", async () => {
      const order = await createOrder();

      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "CONFIRMED" },
      });

      expect(response.statusCode).toBe(204);

      const dbOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(dbOrder[0].status).toBe("CONFIRMED");

      const history = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe("STATUS_CHANGED");
      expect(history[0].previousStatus).toBe("PENDING");
      expect(history[0].newStatus).toBe("CONFIRMED");
    });

    it("deve completar o fluxo positivo completo até DELIVERED", async () => {
      const order = await createOrder();

      await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "CONFIRMED" },
      });
      await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "PREPARING" },
      });
      await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "READY" },
      });
      await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "OUT_FOR_DELIVERY" },
      });
      const lastRes = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "DELIVERED" },
      });

      expect(lastRes.statusCode).toBe(204);
      const history = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(history).toHaveLength(5);
    });

    it("deve rejeitar transição inválida com 409", async () => {
      const order = await createOrder();

      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "READY" },
      });

      expect(response.statusCode).toBe(409);

      const dbOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(dbOrder[0].status).toBe("PENDING");
    });

    it("deve retornar 404 se o pedido não existir", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${randomUUID()}/status`,
        payload: { status: "CONFIRMED" },
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 400 se o status informado for fora do schema", async () => {
      const order = await createOrder();
      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "STATUS_INVENTADO" },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
