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
      const order = await createOrder("DELIVERY", "PREPARING");

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

    it("deve criar um delivery quando o pedido estiver READY (201)", async () => {
      const order = await createOrder("DELIVERY", "READY");

      const response = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/delivery`,
      });

      expect(response.statusCode).toBe(201);
      expect(response.json().status).toBe("PENDING");
    });

    it.each([
      "PENDING",
      "CONFIRMED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ])("deve rejeitar criação de delivery para pedido em %s (409)", async (status) => {
      const order = await createOrder("DELIVERY", status);

      const response = await app.inject({
        method: "POST",
        url: `/orders/${order.id}/delivery`,
      });

      expect(response.statusCode).toBe(409);

      const dbDelivery = await db
        .select()
        .from(deliveries)
        .where(eq(deliveries.orderId, order.id));
      expect(dbDelivery).toHaveLength(0);
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

      const orderEvents = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(orderEvents).toHaveLength(1);
      expect(orderEvents[0]).toMatchObject({
        action: "STATUS_CHANGED",
        previousStatus: "READY",
        newStatus: "OUT_FOR_DELIVERY",
        observation: "Expedição iniciada.",
      });

      const deliveryEvents = await db
        .select()
        .from(deliveryHistory)
        .where(eq(deliveryHistory.deliveryId, dbDelivery[0].id));
      expect(deliveryEvents).toHaveLength(2);
      expect(deliveryEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "DELIVERY_CREATED",
            previousStatus: "PENDING",
            newStatus: "PENDING",
          }),
          expect.objectContaining({
            action: "DELIVERY_STARTED",
            previousStatus: "PENDING",
            newStatus: "OUT_FOR_DELIVERY",
          }),
        ]),
      );
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

      const orderEvents = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(orderEvents).toHaveLength(2);
      expect(orderEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "STATUS_CHANGED",
            previousStatus: "READY",
            newStatus: "OUT_FOR_DELIVERY",
            observation: "Expedição iniciada.",
          }),
          expect.objectContaining({
            action: "STATUS_CHANGED",
            previousStatus: "OUT_FOR_DELIVERY",
            newStatus: "DELIVERED",
            observation: "Entrega concluída.",
          }),
        ]),
      );

      const deliveryEvents = await db
        .select()
        .from(deliveryHistory)
        .where(eq(deliveryHistory.deliveryId, dbDelivery[0].id));
      expect(deliveryEvents).toHaveLength(3);
      expect(deliveryEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: "DELIVERY_CREATED" }),
          expect.objectContaining({ action: "DELIVERY_STARTED" }),
          expect.objectContaining({
            action: "DELIVERY_COMPLETED",
            previousStatus: "OUT_FOR_DELIVERY",
            newStatus: "DELIVERED",
          }),
        ]),
      );
    });
  });
});
