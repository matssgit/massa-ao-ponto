import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";

describe("Toggle Product Status (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(restaurants);
  });

  it("deve inativar e reativar um produto existente sem receber payload", async () => {
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
        active: true,
      })
      .returning();

    const response1 = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest.id}/products/${prod.id}/toggle-status`,
    });
    expect(response1.statusCode).toBe(200);
    expect(response1.json().active).toBe(false);

    const response2 = await app.inject({
      method: "PATCH",
      url: `/restaurants/${rest.id}/products/${prod.id}/toggle-status`,
    });
    expect(response2.statusCode).toBe(200);
    expect(response2.json().active).toBe(true);
  });
});
