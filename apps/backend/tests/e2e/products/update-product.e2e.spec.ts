import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";

describe("Update Product (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(restaurants);
  });

  it("deve atualizar o nome e o preço de um produto existente", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
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
