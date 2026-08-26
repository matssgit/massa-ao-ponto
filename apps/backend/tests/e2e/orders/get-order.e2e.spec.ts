import {
  addons,
  customers,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItemAddons,
  orderItems,
  orders,
  productCategories,
  products,
  reservationHistory,
  reservations,
  restaurants,
  tables,
} from "../../../src/db/schema/index.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("Get Order (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(deliveryHistory);
    await db.delete(deliveries);
    await db.delete(orderHistory);
    await db.delete(orderItemAddons);
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(reservationHistory);
    await db.delete(reservations);
    await db.delete(tables);
    await db.delete(products);
    await db.delete(addons);
    await db.delete(productCategories);
    await db.delete(customers);
    await db.delete(restaurants);
  });

  async function createTenantOrder() {
    const [restaurantA, restaurantB] = await db
      .insert(restaurants)
      .values([
        { name: "Restaurante A", address: "", phone: "1", timezone: "UTC" },
        { name: "Restaurante B", address: "", phone: "2", timezone: "UTC" },
      ])
      .returning();
    const [customer] = await db
      .insert(customers)
      .values({ name: "Cliente", phone: "11999" })
      .returning();
    const [order] = await db
      .insert(orders)
      .values({
        restaurantId: restaurantA.id,
        customerId: customer.id,
        type: "PICKUP",
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal: 4000,
        deliveryFee: 0,
        total: 4000,
        customerName: customer.name,
        customerPhone: customer.phone,
      })
      .returning();

    return { restaurantA, restaurantB, order };
  }

  it("deve retornar 200 com os dados detalhados do pedido, incluindo itens e preservando os snapshots", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [cust] = await db
      .insert(customers)
      .values({ name: "Matheus", phone: "11999" })
      .returning();
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Pizzas", displayOrder: 0 })
      .returning();
    const [prod] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "Pizza Original",
        description: "",
        price: 4000,
        active: true,
        displayOrder: 0,
      })
      .returning();

    const [order] = await db
      .insert(orders)
      .values({
        restaurantId: rest.id,
        customerId: cust.id,
        type: "DELIVERY",
        status: "PENDING",
        paymentStatus: "PENDING",
        subtotal: 4500,
        deliveryFee: 500,
        total: 5000,
        customerName: "Matheus Snapshot",
        customerPhone: "11999",
        deliveryStreet: "Rua das Flores",
        deliveryNumber: "123",
        deliveryComplement: "Apto 1",
        deliveryNeighborhood: "Centro",
        deliveryCity: "Guarujá",
        deliveryState: "SP",
        deliveryZipCode: "11410-000",
        observation: null,
      })
      .returning();

    const [insertedItem] = await db
      .insert(orderItems)
      .values([
        {
          orderId: order.id,
          productId: prod.id,
          productName: "Pizza Snapshot",
          quantity: 1,
          unitPrice: 3500,
          subtotal: 4500,
        },
      ])
      .returning();

    const [addon] = await db
      .insert(addons)
      .values({
        id: randomUUID(),
        restaurantId: rest.id,
        name: "Borda Recheada Original",
        price: 1500,
      })
      .returning();

    await db.insert(orderItemAddons).values({
      orderItemId: insertedItem.id,
      addonId: addon.id,
      addonName: "Borda Recheada Snapshot",
      unitPrice: 1000,
      quantity: 1,
      subtotal: 1000,
    });

    await db
      .update(products)
      .set({ name: "Pizza Modificada", price: 6000 })
      .where(eq(products.id, prod.id));

    const statusResponse = await app.inject({
      method: "PATCH",
      url: `/orders/${order.id}/status`,
      payload: { status: "CONFIRMED" },
    });
    const paymentResponse = await app.inject({
      method: "PATCH",
      url: `/orders/${order.id}/payment`,
    });

    expect(statusResponse.statusCode).toBe(204);
    expect(paymentResponse.statusCode).toBe(200);

    await db
      .update(orderHistory)
      .set({ createdAt: new Date("2026-08-26T12:00:00.000Z") })
      .where(
        and(
          eq(orderHistory.orderId, order.id),
          eq(orderHistory.action, "STATUS_CHANGED"),
        ),
      );
    await db
      .update(orderHistory)
      .set({ createdAt: new Date("2026-08-26T12:01:00.000Z") })
      .where(
        and(
          eq(orderHistory.orderId, order.id),
          eq(orderHistory.action, "PAYMENT_CONFIRMED"),
        ),
      );

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${rest.id}/orders/${order.id}`,
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();

    expect(data.order.id).toBe(order.id);
    expect(data.order.type).toBe("DELIVERY");
    expect(data.order.customerName).toBe("Matheus Snapshot");
    expect(data.order.deliveryStreet).toBe("Rua das Flores");
    expect(data.order.total).toBe(5000);

    expect(data.items).toHaveLength(1);
    expect(data.items[0].productName).toBe("Pizza Snapshot");
    expect(data.items[0].unitPrice).toBe(3500);

    // Validação da recuperação do Addon pela API
    expect(data.items[0].addons).toHaveLength(1);
    expect(data.items[0].addons[0].addonName).toBe("Borda Recheada Snapshot");
    expect(data.items[0].addons[0].unitPrice).toBe(1000);
    expect(data.items[0].addons[0].quantity).toBe(1);
    expect(data.items[0].addons[0].subtotal).toBe(1000);

    expect(data.history).toHaveLength(2);
    expect(data.history.map(({ action }: { action: string }) => action)).toEqual(
      ["STATUS_CHANGED", "PAYMENT_CONFIRMED"],
    );
    expect(data.history[0]).toMatchObject({
      orderId: order.id,
      previousStatus: "PENDING",
      newStatus: "CONFIRMED",
      observation: null,
    });
    expect(data.history[1]).toMatchObject({
      orderId: order.id,
      previousStatus: "CONFIRMED",
      newStatus: "CONFIRMED",
      observation: null,
    });
  });

  it("deve retornar histórico vazio quando o pedido não possuir eventos", async () => {
    const { restaurantA, order } = await createTenantOrder();

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurantA.id}/orders/${order.id}`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().history).toEqual([]);
  });

  it("deve retornar 404 para pedido inexistente", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/orders/${randomUUID()}`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("deve retornar 404 para pedido pertencente a outro restaurante", async () => {
    const { restaurantB, order } = await createTenantOrder();

    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${restaurantB.id}/orders/${order.id}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ message: "Pedido não encontrado." });
  });

  it("não deve expor o pedido pela rota global antiga", async () => {
    const { order } = await createTenantOrder();

    const response = await app.inject({
      method: "GET",
      url: `/orders/${order.id}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("deve retornar 400 para restaurantId inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/invalid-uuid/orders/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(400);
  });

  it("deve retornar 400 para orderId inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/restaurants/${randomUUID()}/orders/invalid-uuid-123`,
    });
    expect(response.statusCode).toBe(400);
  });
});
