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
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

describe("Get Order (E2E)", () => {
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
        subtotal: 4000,
        deliveryFee: 500,
        total: 4500,
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

    await db.insert(orderItems).values([
      {
        orderId: order.id,
        productId: prod.id,
        productName: "Pizza Snapshot",
        quantity: 1,
        unitPrice: 3500,
        subtotal: 3500,
      },
    ]);

    await db
      .update(products)
      .set({ name: "Pizza Modificada", price: 6000 })
      .where(eq(products.id, prod.id));

    const response = await app.inject({
      method: "GET",
      url: `/orders/${order.id}`,
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();

    expect(data.order.id).toBe(order.id);
    expect(data.order.type).toBe("DELIVERY");
    expect(data.order.customerName).toBe("Matheus Snapshot");
    expect(data.order.deliveryStreet).toBe("Rua das Flores");
    expect(data.order.total).toBe(4500);

    expect(data.items).toHaveLength(1);
    expect(data.items[0].productName).toBe("Pizza Snapshot");
    expect(data.items[0].unitPrice).toBe(3500);
  });

  it("deve retornar 404 para pedido inexistente", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/orders/${randomUUID()}`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("deve retornar 400 para UUID inválido", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/orders/invalid-uuid-123`,
    });
    expect(response.statusCode).toBe(400);
  });
});
