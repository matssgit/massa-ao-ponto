import { useTestAuth } from "../../helpers/auth.js";
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
  restaurants,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const auth = useTestAuth(app);

describe("Pay Order (E2E)", () => {
  let customerSequence = 0;

  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(deliveryHistory);
    await db.delete(deliveries);
    await db.delete(orderHistory);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(customers);
    await db.delete(restaurants);
  });

  async function createOrder(status: string, paymentStatus: string) {
    const [restaurant] = await db
      .insert(restaurants)
      .values({ name: "Rest", address: "Rua", phone: "1", timezone: "UTC" })
      .returning();
    await auth.grant(restaurant.id);
    const [customer] = await db
      .insert(customers)
      .values({
        name: "Cli",
        phone: `1190000${String(customerSequence++).padStart(4, "0")}`,
      })
      .returning();
    const [order] = await db
      .insert(orders)
      .values({
        restaurantId: restaurant.id,
        customerId: customer.id,
        type: "DELIVERY",
        status: status as any,
        paymentStatus: paymentStatus as any,
        subtotal: 10,
        deliveryFee: 0,
        total: 10,
        customerName: "A",
        customerPhone: "1",
      })
      .returning();
    return order;
  }

  describe("PATCH /restaurants/:restaurantId/orders/:orderId/payment", () => {
    it("deve confirmar o pagamento de um pedido e retornar 200", async () => {
      const order = await createOrder("PENDING", "PENDING");

      const response = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/payment`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().paymentStatus).toBe("PAID");

      const dbOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(dbOrder[0].paymentStatus).toBe("PAID");

      const history = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe("PAYMENT_CONFIRMED");
      expect(history[0].previousStatus).toBe("PENDING");
      expect(history[0].newStatus).toBe("PENDING");
    });

    it("deve retornar 409 se o pedido já estiver pago", async () => {
      const order = await createOrder("PENDING", "PAID");
      const response = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/payment`,
      });
      expect(response.statusCode).toBe(409);
    });

    it("deve rejeitar o pagamento de um pedido DELIVERED (409)", async () => {
      const order = await createOrder("DELIVERED", "PENDING");
      const response = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/payment`,
      });
      expect(response.statusCode).toBe(409);
    });

    it("deve retornar 404 para pedido inexistente", async () => {
      const response = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${randomUUID()}/orders/${randomUUID()}/payment`,
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 400 para UUID inválido", async () => {
      const response = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${(await auth.createRestaurant()).id}/orders/invalid-uuid/payment`,
      });
      expect(response.statusCode).toBe(400);
    });

    it("deve serializar duas confirmações de pagamento concorrentes", async () => {
      const order = await createOrder("PENDING", "PENDING");

      const responses = await Promise.all([
        app.inject({
          headers: auth.headers,
          method: "PATCH",
          url: `/restaurants/${order.restaurantId}/orders/${order.id}/payment`,
        }),
        app.inject({
          headers: auth.headers,
          method: "PATCH",
          url: `/restaurants/${order.restaurantId}/orders/${order.id}/payment`,
        }),
      ]);

      expect(responses.map(({ statusCode }) => statusCode).sort()).toEqual([
        200, 409,
      ]);
    });

    it("deve retornar 404 para pedido de outro restaurante sem pagar ou gravar histórico", async () => {
      const order = await createOrder("PENDING", "PENDING");
      const otherTenantOrder = await createOrder("PENDING", "PENDING");

      const response = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/restaurants/${otherTenantOrder.restaurantId}/orders/${order.id}/payment`,
      });

      expect(response.statusCode).toBe(404);

      const [unchangedOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(unchangedOrder.paymentStatus).toBe("PENDING");
      expect(unchangedOrder.updatedAt.getTime()).toBe(order.updatedAt.getTime());

      const history = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(history).toHaveLength(0);
    });

    it("deve remover a rota global antiga", async () => {
      const order = await createOrder("PENDING", "PENDING");
      const response = await app.inject({
        headers: auth.headers,
        method: "PATCH",
        url: `/orders/${order.id}/payment`,
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
