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

const auth = useTestAuth(app);

describe("Products Sorting (E2E)", () => {
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

  it("deve listar produtos ordenados por displayOrder e id determinístico", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Pizzas", displayOrder: 1 })
      .returning();

    const [prodC] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "C",
        price: 10,
        displayOrder: 2,
      })
      .returning();
    const [prodA] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "A",
        price: 10,
        displayOrder: 1,
      })
      .returning();
    const [prodB] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "B",
        price: 10,
        displayOrder: 1,
      })
      .returning();

    const response = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/products`,
    });

    expect(response.statusCode).toBe(200);

    const items = response.json();
    expect(items).toHaveLength(3);

    const sortedTieBreaker = [prodA, prodB].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    expect(items[0].id).toBe(sortedTieBreaker[0].id);
    expect(items[1].id).toBe(sortedTieBreaker[1].id);
    expect(items[2].id).toBe(prodC.id);
  });

  it("deve alterar o displayOrder através do endpoint de atualização e refletir na listagem", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Pizzas", displayOrder: 1 })
      .returning();

    const [prod1] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "Prod1",
        price: 10,
        displayOrder: 1,
      })
      .returning();
    const [prod2] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "Prod2",
        price: 10,
        displayOrder: 2,
      })
      .returning();

    const updateResponse = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${rest.id}/products/${prod2.id}`,
      payload: { displayOrder: 0 },
    });

    expect(updateResponse.statusCode).toBe(200);

    const listResponse = await app.inject({
      headers: auth.headers,
      method: "GET",
      url: `/restaurants/${rest.id}/products`,
    });
    const items = listResponse.json();

    expect(items[0].id).toBe(prod2.id);
    expect(items[1].id).toBe(prod1.id);
  });
});
