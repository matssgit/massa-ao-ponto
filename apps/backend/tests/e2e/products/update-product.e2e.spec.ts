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

describe("Update Product (E2E)", () => {
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

  it("deve atualizar o nome e o preço de um produto existente", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "C", displayOrder: 1 })
      .returning();
    const [prod] = await db
      .insert(products)
      .values({
        restaurantId: rest.id,
        categoryId: cat.id,
        name: "P",
        description: "",
        price: 1000,
        displayOrder: 1,
      })
      .returning();

    const response = await app.inject({
      headers: auth.headers,
      method: "PATCH",
      url: `/restaurants/${rest.id}/products/${prod.id}`,
      payload: { name: "P Atualizado", price: 2000 },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json();
    expect(data.name).toBe("P Atualizado");
    expect(data.price).toBe(2000);
  });
});
