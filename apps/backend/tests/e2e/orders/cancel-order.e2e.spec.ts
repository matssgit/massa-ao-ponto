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

describe("Cancel Order (E2E)", () => {
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

  async function createOrder(status: string) {
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
        status: status as any,
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

  describe("PATCH /orders/:orderId/cancel", () => {
    it("deve cancelar um pedido PENDING com sucesso (200)", async () => {
      const order = await createOrder("PENDING");

      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/cancel`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().status).toBe("CANCELLED");

      const dbOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(dbOrder[0].status).toBe("CANCELLED");

      const history = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe("CANCELLED");
      expect(history[0].previousStatus).toBe("PENDING");
      expect(history[0].newStatus).toBe("CANCELLED");
    });

    it("deve cancelar um pedido CONFIRMED com sucesso (200)", async () => {
      const order = await createOrder("CONFIRMED");
      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/cancel`,
      });
      expect(response.statusCode).toBe(200);
    });

    it("deve rejeitar cancelamento de pedido em PREPARING ou DELIVERED (409)", async () => {
      const preparingOrder = await createOrder("PREPARING");
      const preparingRes = await app.inject({
        method: "PATCH",
        url: `/orders/${preparingOrder.id}/cancel`,
      });
      expect(preparingRes.statusCode).toBe(409);

      const deliveredOrder = await createOrder("DELIVERED");
      const deliveredRes = await app.inject({
        method: "PATCH",
        url: `/orders/${deliveredOrder.id}/cancel`,
      });
      expect(deliveredRes.statusCode).toBe(409);
    });

    it("deve retornar 404 para pedido inexistente", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${randomUUID()}/cancel`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 400 para UUID inválido", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: `/orders/invalid-uuid/cancel`,
      });
      expect(response.statusCode).toBe(400);
    });

    it("deve validar que uma segunda tentativa simultânea falharia ao tentar cancelar um pedido já cancelado (409)", async () => {
      const order = await createOrder("PENDING");

      // Primeira chamada (Concorre e ganha o Lock)
      await app.inject({ method: "PATCH", url: `/orders/${order.id}/cancel` });

      // Segunda chamada (Leria 'CANCELLED' do banco e cairia na validação da regra do Use Case)
      const secondCall = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/cancel`,
      });

      expect(secondCall.statusCode).toBe(409);
    });
  });
});
