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

describe("Delivery Flow (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    // Ordem estrita de deleção (evitando Foreign Key errors)
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

  async function createOrder(type: "DELIVERY" | "PICKUP", status: string) {
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
        type,
        status: status as any,
        paymentStatus: "PENDING",
        subtotal: 10,
        deliveryFee: 0,
        total: 10,
        customerName: "A",
        customerPhone: "1",
        deliveryStreet: type === "DELIVERY" ? "Rua A" : null,
        deliveryNumber: type === "DELIVERY" ? "123" : null,
        deliveryNeighborhood: type === "DELIVERY" ? "Bairro" : null,
        deliveryCity: type === "DELIVERY" ? "Cidade" : null,
        deliveryState: type === "DELIVERY" ? "SP" : null,
        deliveryZipCode: type === "DELIVERY" ? "000" : null,
      })
      .returning();
    return order;
  }

  describe("POST /orders/:orderId/delivery", () => {
    it("deve criar um delivery para um pedido DELIVERY válido (201)", async () => {
      const order = await createOrder("DELIVERY", "PENDING");

      const response = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/delivery`,
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().status).toBe("PENDING");

      const dbDelivery = await db
        .select()
        .from(deliveries)
        .where(eq(deliveries.orderId, order.id));
      expect(dbDelivery).toHaveLength(1);
    });

    it("deve rejeitar delivery para pedido PICKUP (409)", async () => {
      const order = await createOrder("PICKUP", "PENDING");
      const response = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/delivery`,
      });
      expect(response.statusCode).toBe(409);
    });
  });

  describe("PATCH /orders/:orderId/delivery/start", () => {
    it("deve iniciar a entrega e alterar status do pedido e do delivery (204)", async () => {
      // Pedido pronto na cozinha
      const order = await createOrder("DELIVERY", "READY");
      await app.inject({ method: "POST", url: `/orders/${order.id}/delivery` });

      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/delivery/start`,
      });
      expect(response.statusCode).toBe(204);

      // Valida atomicidade no Order e Delivery
      const dbOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(dbOrder[0].status).toBe("OUT_FOR_DELIVERY");

      const dbDelivery = await db
        .select()
        .from(deliveries)
        .where(eq(deliveries.orderId, order.id));
      expect(dbDelivery[0].status).toBe("OUT_FOR_DELIVERY");
    });

    it("deve rejeitar início de entrega se o pedido não estiver READY (409)", async () => {
      // Pedido ainda está sendo preparado
      const order = await createOrder("DELIVERY", "PREPARING");
      await app.inject({ method: "POST", url: `/orders/${order.id}/delivery` });

      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/delivery/start`,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("PATCH /orders/:orderId/delivery/complete", () => {
    it("deve concluir a entrega e alterar status do pedido e do delivery (204)", async () => {
      const order = await createOrder("DELIVERY", "READY");
      await app.inject({ method: "POST", url: `/orders/${order.id}/delivery` });
      await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/delivery/start`,
      });

      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/delivery/complete`,
      });
      expect(response.statusCode).toBe(204);

      const dbOrder = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(dbOrder[0].status).toBe("DELIVERED");

      const dbDelivery = await db
        .select()
        .from(deliveries)
        .where(eq(deliveries.orderId, order.id));
      expect(dbDelivery[0].status).toBe("DELIVERED");
    });
  });
});
