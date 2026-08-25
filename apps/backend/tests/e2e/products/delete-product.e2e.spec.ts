import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  customers,
  orderItems,
  orders,
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

describe("Delete Product (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(orderItems);
    await db.delete(orders);
    await db.delete(customers);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(restaurants);
  });

  it("deve excluir o produto e retornar 204 se não houver pedidos", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Doces", displayOrder: 1 })
      .returning();
    const [prod] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "Bolo",
        price: 1000,
        displayOrder: 1,
      })
      .returning();

    const response = await app.inject({
      method: "DELETE",
      url: `/restaurants/${rest.id}/products/${prod.id}`,
    });
    expect(response.statusCode).toBe(204);
  });

  it("deve retornar 409 se o produto possuir pedidos (Preservação do Histórico)", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [customer] = await db
      .insert(customers)
      .values({ name: "C", phone: "11" })
      .returning();
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Doces", displayOrder: 1 })
      .returning();
    const [prod] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "Bolo",
        price: 1000,
        displayOrder: 1,
      })
      .returning();

    const [order] = await db
      .insert(orders)
      .values({
        restaurantId: rest.id,
        customerId: customer.id,
        type: "PICKUP",
        subtotal: 1000,
        total: 1000,
        customerName: "C",
        customerPhone: "11",
      })
      .returning();

    await db.insert(orderItems).values({
      orderId: order.id,
      productId: prod.id,
      productName: prod.name,
      unitPrice: prod.price,
      quantity: 1,
      subtotal: prod.price,
    });

    const response = await app.inject({
      method: "DELETE",
      url: `/restaurants/${rest.id}/products/${prod.id}`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("deve retornar 404 para acesso cross-tenant", async () => {
    const [rest1] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [rest2] = await db
      .insert(restaurants)
      .values({ name: "R2", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest1.id, name: "Doces", displayOrder: 1 })
      .returning();
    const [prod] = await db
      .insert(products)
      .values({
        restaurantId: rest1.id,
        categoryId: cat.id,
        name: "Bolo",
        price: 1000,
        displayOrder: 1,
      })
      .returning();

    const response = await app.inject({
      method: "DELETE",
      url: `/restaurants/${rest2.id}/products/${prod.id}`,
    });
    expect(response.statusCode).toBe(404);
  });
});
