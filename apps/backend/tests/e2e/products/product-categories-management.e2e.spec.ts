import {
  addons,
  deliveries,
  deliveryHistory,
  orderHistory,
  orderItems,
  orders,
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

describe("Product Categories Management (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    // 1. Limpa rastros logísticos e de histórico de pedidos
    await db.delete(deliveryHistory);
    await db.delete(deliveries);
    await db.delete(orderHistory);

    // 2. Limpa os pedidos
    await db.delete(orderItems);
    await db.delete(orders);

    // 3. Limpa o catálogo
    await db.delete(addons);
    await db.delete(products);
    await db.delete(productCategories);

    // 4. Limpa o restaurante
    await db.delete(restaurants);
  });
  
  it("deve retornar a categoria no endpoint individual", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Sucos", displayOrder: 1 })
      .returning();

    const response = await app.inject({
      method: "GET",
      url: `/product-categories/${cat.id}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe("Sucos");
  });

  it("deve atualizar o nome de uma categoria existente via PATCH e proteger cross-tenant", async () => {
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
      .values({ restaurantId: rest1.id, name: "Pizzas", displayOrder: 1 })
      .returning();

    const updateResponse = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest1.id}/product-categories/${cat.id}`,
      payload: { name: "Pizzas Artesanais" },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().name).toBe("Pizzas Artesanais");

    const crossTenantResponse = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest2.id}/product-categories/${cat.id}`,
      payload: { name: "Hack" },
    });
    expect(crossTenantResponse.statusCode).toBe(409);
  });

  it("deve inativar e reativar a categoria via toggle de status", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [cat] = await db
      .insert(productCategories)
      .values({
        restaurantId: rest.id,
        name: "Doces",
        displayOrder: 1,
        active: true,
      })
      .returning();

    const res1 = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest.id}/product-categories/${cat.id}/toggle-status`,
    });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().active).toBe(false);

    const res2 = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest.id}/product-categories/${cat.id}/toggle-status`,
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().active).toBe(true);
  });
});
