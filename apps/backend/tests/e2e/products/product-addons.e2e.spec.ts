import { useTestAuth } from "../../helpers/auth.js";
import {
  addons,
  productAddons,
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { randomUUID } from "node:crypto";

const auth = useTestAuth(app);

describe("Product Addons Association (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(productAddons);
    await db.delete(addons);
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(restaurants);
  });

  it("deve realizar ciclo completo: criar associacao, listar e deletar", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Pizzas", displayOrder: 1 })
      .returning();
    const [prod] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "Calabresa",
        price: 5000,
        displayOrder: 1,
      })
      .returning();
    const [addon] = await db
      .insert(addons)
      .values({ restaurantId: rest.id, name: "Bacon", price: 500 })
      .returning();

    const postRes = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${rest.id}/products/${prod.id}/addons/${addon.id}`,
    });
    expect(postRes.statusCode).toBe(201);

    const getRes = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/products/${prod.id}/addons`,
    });
    expect(getRes.statusCode).toBe(200);
    expect(getRes.json()).toHaveLength(1);
    expect(getRes.json()[0].id).toBe(addon.id);

    const delRes = await app.inject({
      headers: auth.headers,
      method: "DELETE",
      url: `/restaurants/${rest.id}/products/${prod.id}/addons/${addon.id}`,
    });
    expect(delRes.statusCode).toBe(204);

    const getAfterDel = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/products/${prod.id}/addons`,
    });
    expect(getAfterDel.json()).toHaveLength(0);
  });

  it("deve bloquear associacoes cross-tenant (409)", async () => {
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
    const [prod] = await db
      .insert(products)
      .values({
        restaurantId: rest1.id,
        categoryId: cat.id,
        name: "Calabresa",
        price: 5000,
        displayOrder: 1,
      })
      .returning();
    const [addon] = await db
      .insert(addons)
      .values({ restaurantId: rest2.id, name: "Bacon", price: 500 })
      .returning();

    const postRes = await app.inject({
      headers: auth.headers,
      method: "POST",
      url: `/restaurants/${rest1.id}/products/${prod.id}/addons/${addon.id}`,
    });
    expect(postRes.statusCode).toBe(409);
  });
});
