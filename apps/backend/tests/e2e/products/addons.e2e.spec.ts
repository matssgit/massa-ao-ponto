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

describe("Addons Management (E2E)", () => {
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

  it("deve realizar o ciclo CRUD completo de um Addon com sucesso", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();

    // 1. CREATE
    const createRes = await app.inject({
      method: "POST",
      url: `/restaurants/${rest.id}/addons`,
      payload: { name: "Bacon", price: 400 },
    });
    expect(createRes.statusCode).toBe(201);
    const addonId = createRes.json().id;

    // 2. LIST (Ordered by name)
    await db
      .insert(addons)
      .values({ restaurantId: rest.id, name: "Alho", price: 100 });
    const listRes = await app.inject({
      method: "GET",
      url: `/restaurants/${rest.id}/addons`,
    });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json()[0].name).toBe("Alho"); // Alho vem antes de Bacon

    // 3. GET
    const getRes = await app.inject({
      method: "GET",
      url: `/addons/${addonId}`,
    });
    expect(getRes.statusCode).toBe(200);

    // 4. UPDATE
    const updateRes = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest.id}/addons/${addonId}`,
      payload: { price: 450 },
    });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().price).toBe(450);

    // 5. TOGGLE
    const toggleRes = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest.id}/addons/${addonId}/toggle-status`,
    });
    expect(toggleRes.statusCode).toBe(200);
    expect(toggleRes.json().active).toBe(false);

    // 6. DELETE
    const deleteRes = await app.inject({
      method: "DELETE",
      url: `/restaurants/${rest.id}/addons/${addonId}`,
    });
    expect(deleteRes.statusCode).toBe(204);
  });

  it("deve rejeitar atualizacao cross-tenant (409)", async () => {
    const [rest1] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [rest2] = await db
      .insert(restaurants)
      .values({ name: "R2", address: "", phone: "", timezone: "UTC" })
      .returning();
    const [addon] = await db
      .insert(addons)
      .values({ restaurantId: rest1.id, name: "Ovo", price: 200 })
      .returning();

    const crossRes = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest2.id}/addons/${addon.id}`,
      payload: { price: 300 },
    });
    expect(crossRes.statusCode).toBe(409);
  });
});
