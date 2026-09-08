import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../../../src/server.js";
import { db } from "../../../src/db/index.js";
import { addons, productAddons, productCategories, products, restaurants } from "../../../src/db/schema/index.js";
import { eq, inArray } from "drizzle-orm";

const restaurantId = "10000000-0000-4000-8000-000000000001";
const otherRestaurantId = "10000000-0000-4000-8000-000000000002";
const categoryFirstId = "20000000-0000-4000-8000-000000000001";
const categorySecondId = "20000000-0000-4000-8000-000000000002";
const categoryInactiveId = "20000000-0000-4000-8000-000000000003";
const productFirstId = "30000000-0000-4000-8000-000000000001";
const productSecondId = "30000000-0000-4000-8000-000000000002";
const productInactiveId = "30000000-0000-4000-8000-000000000003";
const productHiddenCategoryId = "30000000-0000-4000-8000-000000000004";
const addonFirstId = "40000000-0000-4000-8000-000000000001";
const addonSecondId = "40000000-0000-4000-8000-000000000002";
const addonInactiveId = "40000000-0000-4000-8000-000000000003";
const addonOtherTenantId = "40000000-0000-4000-8000-000000000004";

describe("Public catalog (E2E)", () => {
  beforeAll(async () => { await app.ready(); });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => {
    await db.delete(restaurants).where(inArray(restaurants.id, [restaurantId, otherRestaurantId]));
    await db.insert(restaurants).values([
      { id: restaurantId, name: "Public house", address: "Main", slug: "public-house", publicEnabled: true },
      { id: otherRestaurantId, name: "Other house", address: "Other", slug: "other-house", publicEnabled: true },
    ]);
    await db.insert(productCategories).values([
      { id: categoryFirstId, restaurantId, name: "First", displayOrder: 1 },
      { id: categorySecondId, restaurantId, name: "Second", displayOrder: 1 },
      { id: categoryInactiveId, restaurantId, name: "Hidden", displayOrder: 0, active: false },
    ]);
    await db.insert(products).values([
      { id: productFirstId, restaurantId, categoryId: categoryFirstId, name: "Alpha", description: null, price: 2590, displayOrder: 1 },
      { id: productSecondId, restaurantId, categoryId: categoryFirstId, name: "Beta", description: "Public description", price: 3050, displayOrder: 1 },
      { id: productInactiveId, restaurantId, categoryId: categoryFirstId, name: "Inactive", price: 1, active: false },
      { id: productHiddenCategoryId, restaurantId, categoryId: categoryInactiveId, name: "Hidden category product", price: 2 },
    ]);
    await db.insert(addons).values([
      { id: addonFirstId, restaurantId, name: "A addon", description: null, price: 350 },
      { id: addonSecondId, restaurantId, name: "B addon", description: "Extra", price: 425 },
      { id: addonInactiveId, restaurantId, name: "Inactive addon", price: 1, active: false },
      { id: addonOtherTenantId, restaurantId: otherRestaurantId, name: "Foreign addon", price: 999 },
    ]);
    await db.insert(productAddons).values([
      { productId: productFirstId, addonId: addonSecondId },
      { productId: productFirstId, addonId: addonFirstId },
      { productId: productFirstId, addonId: addonInactiveId },
      { productId: productFirstId, addonId: addonOtherTenantId },
    ]);
  });
  afterEach(async () => {
    await db.delete(restaurants).where(inArray(restaurants.id, [restaurantId, otherRestaurantId]));
  });

  it("returns only active tenant data with deterministic ordering and cents", async () => {
    const response = await app.inject({ url: "/public/restaurants/public-house/catalog" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.categories.map((category: { id: string }) => category.id)).toEqual([
      categoryFirstId,
      categorySecondId,
    ]);
    expect(body.categories[0].products.map((product: { id: string }) => product.id)).toEqual([
      productFirstId,
      productSecondId,
    ]);
    expect(body.categories[0].products[0].addons.map((addon: { id: string }) => addon.id)).toEqual([
      addonFirstId,
      addonSecondId,
    ]);
    expect(body.categories[0].products[0].price).toBe(2590);
    expect(Number.isInteger(body.categories[0].products[0].price)).toBe(true);
    expect(body.categories[1].products).toEqual([]);
    expect(Object.keys(body.categories[0]).sort()).toEqual(["displayOrder", "id", "name", "products"]);
    expect(Object.keys(body.categories[0].products[0]).sort()).toEqual([
      "addons", "categoryId", "description", "displayOrder", "id", "name", "price",
    ]);
    expect(Object.keys(body.categories[0].products[0].addons[0]).sort()).toEqual([
      "description", "id", "name", "price",
    ]);
    expect(response.body).not.toMatch(/restaurantId|active|createdAt|updatedAt|Foreign|Inactive|Hidden/);
  });

  it("returns the same 404 for unpublished and missing Restaurants, and rejects invalid slugs", async () => {
    await db.update(restaurants).set({ publicEnabled: false }).where(eq(restaurants.id, restaurantId));
    const hidden = await app.inject({ url: "/public/restaurants/public-house/catalog" });
    const missing = await app.inject({ url: "/public/restaurants/missing-house/catalog" });
    expect(hidden.statusCode).toBe(404);
    expect(hidden.json()).toEqual(missing.json());
    expect((await app.inject({ url: "/public/restaurants/INVALID/catalog" })).statusCode).toBe(400);
  });
});
