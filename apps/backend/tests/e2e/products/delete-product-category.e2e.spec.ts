import { useTestAuth } from "../../helpers/auth.js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  productCategories,
  products,
  restaurants,
} from "../../../src/db/schema/index.js";

import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

const auth = useTestAuth(app);

describe("Delete Product Category (E2E)", () => {
  beforeAll(async () => await app.ready());
  afterAll(async () => await app.close());

  beforeEach(async () => {
    await db.delete(products);
    await db.delete(productCategories);
    await db.delete(restaurants);
  });

  it("deve excluir a categoria e retornar 204 se ela estiver vazia", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Sucos", displayOrder: 1 })
      .returning();

    const response = await app.inject({
      headers: auth.headers,
      method: "DELETE",
      url: `/restaurants/${rest.id}/product-categories/${cat.id}`,
    });
    expect(response.statusCode).toBe(204);

    const verify = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, cat.id));
    expect(verify).toHaveLength(0);
  });

  it("deve retornar 409 se a categoria possuir produtos vinculados (Integridade preservada)", async () => {
    const [rest] = await db
      .insert(restaurants)
      .values({ name: "R", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(rest.id);
    const [cat] = await db
      .insert(productCategories)
      .values({ restaurantId: rest.id, name: "Sucos", displayOrder: 1 })
      .returning();
    await db.insert(products).values({
      restaurantId: rest.id,
      categoryId: cat.id,
      name: "Laranja",
      price: 1000,
      displayOrder: 1,
    });

    const response = await app.inject({
      headers: auth.headers,
      method: "DELETE",
      url: `/restaurants/${rest.id}/product-categories/${cat.id}`,
    });
    expect(response.statusCode).toBe(409);
  });

  it("deve retornar 404 para categoria inexistente", async () => {
    const response = await app.inject({
      headers: auth.headers,
      method: "DELETE",
      url: `/restaurants/${randomUUID()}/product-categories/${randomUUID()}`,
    });
    expect(response.statusCode).toBe(404);
  });

  it("deve retornar 404 e preservar a categoria em exclusão cross-tenant", async () => {
    const [owner] = await db
      .insert(restaurants)
      .values({ name: "R1", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(owner.id);
    const [otherRest] = await db
      .insert(restaurants)
      .values({ name: "R2", address: "", phone: "", timezone: "UTC" })
      .returning();
    await auth.grant(otherRest.id);
    const [category] = await db
      .insert(productCategories)
      .values({ restaurantId: owner.id, name: "Sucos", displayOrder: 1 })
      .returning();

    const response = await app.inject({
      headers: auth.headers,
      method: "DELETE",
      url: `/restaurants/${otherRest.id}/product-categories/${category.id}`,
    });
    expect(response.statusCode).toBe(404);

    const preserved = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, category.id));
    expect(preserved).toHaveLength(1);
  });
});
