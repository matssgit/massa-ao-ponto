import { useTestAuth } from "../../helpers/auth.js";
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
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const auth = useTestAuth(app);

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
    await auth.grant(rest.id);
    const [otherRest] = await db
      .insert(restaurants)
      .values({ name: "R2", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(otherRest.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Sucos", displayOrder: 1 })
      .returning();

    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/product-categories/${cat.id}`,
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().name).toBe("Sucos");

    const crossTenantResponse = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${otherRest.id}/product-categories/${cat.id}`,
    });
    expect(crossTenantResponse.statusCode).toBe(404);

    const oldRouteResponse = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/product-categories/${cat.id}`,
    });
    expect(oldRouteResponse.statusCode).toBe(404);

    const invalidIdResponse = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/product-categories/invalid-id`,
    });
    expect(invalidIdResponse.statusCode).toBe(400);
  });

  it("deve atualizar o nome de uma categoria existente via PATCH e proteger cross-tenant", async () => {
    const [rest1] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest1.id);
    const [rest2] = await db
      .insert(restaurants)
      .values({ name: "R2", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest2.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest1.id, name: "Pizzas", displayOrder: 1 })
      .returning();

    const updateResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${rest1.id}/product-categories/${cat.id}`,
      payload: { name: "Pizzas Artesanais" },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(updateResponse.json().name).toBe("Pizzas Artesanais");

    const crossTenantResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${rest2.id}/product-categories/${cat.id}`,
      payload: { name: "Hack" },
    });
    expect(crossTenantResponse.statusCode).toBe(404);

    const [preservedCategory] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, cat.id));
    expect(preservedCategory.name).toBe("Pizzas Artesanais");
  });

  it("deve inativar e reativar a categoria via toggle de status", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [otherRest] = await db
      .insert(restaurants)
      .values({ name: "R2", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(otherRest.id);
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
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${rest.id}/product-categories/${cat.id}/toggle-status`,
    });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().active).toBe(false);

    const res2 = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${rest.id}/product-categories/${cat.id}/toggle-status`,
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().active).toBe(true);

    const crossTenantResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${otherRest.id}/product-categories/${cat.id}/toggle-status`,
    });
    expect(crossTenantResponse.statusCode).toBe(404);

    const [preservedCategory] = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, cat.id));
    expect(preservedCategory.active).toBe(true);
  });
});
