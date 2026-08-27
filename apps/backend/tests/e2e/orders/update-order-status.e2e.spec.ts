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
import {
  OrderStatus,
  OrderType,
} from "../../../src/modules/orders/repositories/orders-repository.js";
import { randomUUID } from "node:crypto";

describe("Update Order Status (E2E)", () => {
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

  async function createOrder(
    type: OrderType = "DELIVERY",
    status: OrderStatus = "PENDING",
  ) {
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
        status,
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
        deliveryZipCode: type === "DELIVERY" ? "00000-000" : null,
      })
      .returning();
    return order;
  }

  describe("PATCH /restaurants/:restaurantId/orders/:orderId/status", () => {
    it("deve transitar o status de PENDING para CONFIRMED e registrar history (204)", async () => {
      const order = await createOrder();

      const response = await app.inject({
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/status`,
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

    it("deve usar a rota genérica para cozinha e os endpoints especializados para logística DELIVERY", async () => {
      const order = await createOrder();

      for (const status of ["CONFIRMED", "PREPARING", "READY"] as const) {
        const response = await app.inject({
          method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/status`,
          payload: { status },
        });
        expect(response.statusCode).toBe(204);
      }

      const genericStartResponse = await app.inject({
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/status`,
        payload: { status: "OUT_FOR_DELIVERY" },
      });
      expect(genericStartResponse.statusCode).toBe(409);

      const createDeliveryResponse = await app.inject({
        method: "POST",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/delivery`,
      });
      expect(createDeliveryResponse.statusCode).toBe(201);

      const startDeliveryResponse = await app.inject({
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/delivery/start`,
      });
      expect(startDeliveryResponse.statusCode).toBe(204);

      const completeDeliveryResponse = await app.inject({
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/delivery/complete`,
      });
      expect(completeDeliveryResponse.statusCode).toBe(204);

      const [updatedOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(updatedOrder.status).toBe("DELIVERED");

      const history = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(history).toHaveLength(5);

      const [delivery] = await db
        .select()
        .from(deliveries)
        .where(eq(deliveries.orderId, order.id));
      expect(delivery.status).toBe("DELIVERED");

      const deliveryEvents = await db
        .select()
        .from(deliveryHistory)
        .where(eq(deliveryHistory.deliveryId, delivery.id));
      expect(deliveryEvents).toHaveLength(3);
    });

    it("deve permitir READY -> DELIVERED para PICKUP e rejeitar OUT_FOR_DELIVERY", async () => {
      const pickupToComplete = await createOrder("PICKUP", "READY");
      const completeResponse = await app.inject({
        method: "PATCH",
        url: `/restaurants/${pickupToComplete.restaurantId}/orders/${pickupToComplete.id}/status`,
        payload: { status: "DELIVERED" },
      });
      expect(completeResponse.statusCode).toBe(204);

      const pickupToReject = await createOrder("PICKUP", "READY");
      const logisticsResponse = await app.inject({
        method: "PATCH",
        url: `/restaurants/${pickupToReject.restaurantId}/orders/${pickupToReject.id}/status`,
        payload: { status: "OUT_FOR_DELIVERY" },
      });
      expect(logisticsResponse.statusCode).toBe(409);
    });

    it("deve rejeitar CANCELLED pela atualização genérica", async () => {
      const order = await createOrder();

      const response = await app.inject({
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/status`,
        payload: { status: "CANCELLED" },
      });

      expect(response.statusCode).toBe(409);
    });

    it("deve rejeitar transição inválida com 409", async () => {
      const order = await createOrder();

      const response = await app.inject({
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/status`,
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
        url: `/restaurants/${randomUUID()}/orders/${randomUUID()}/status`,
        payload: { status: "CONFIRMED" },
      });
      expect(response.statusCode).toBe(404);
    });

    it("deve retornar 400 se o status informado for fora do schema", async () => {
      const order = await createOrder();
      const response = await app.inject({
        method: "PATCH",
        url: `/restaurants/${order.restaurantId}/orders/${order.id}/status`,
        payload: { status: "STATUS_INVENTADO" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("deve retornar 404 para pedido de outro restaurante sem alterar estado ou histórico", async () => {
      const order = await createOrder();
      const otherTenantOrder = await createOrder();

      const response = await app.inject({
        method: "PATCH",
        url: `/restaurants/${otherTenantOrder.restaurantId}/orders/${order.id}/status`,
        payload: { status: "CONFIRMED" },
      });

      expect(response.statusCode).toBe(404);

      const [unchangedOrder] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, order.id));
      expect(unchangedOrder.status).toBe("PENDING");

      const history = await db
        .select()
        .from(orderHistory)
        .where(eq(orderHistory.orderId, order.id));
      expect(history).toHaveLength(0);
    });

    it("deve remover a rota global antiga", async () => {
      const order = await createOrder();
      const response = await app.inject({
        method: "PATCH",
        url: `/orders/${order.id}/status`,
        payload: { status: "CONFIRMED" },
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
