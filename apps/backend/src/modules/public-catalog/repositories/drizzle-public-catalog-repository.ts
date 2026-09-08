import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { addons, productAddons, productCategories, products } from "../../../db/schema/index.js";
import type { PublicCatalogRepository } from "./public-catalog-repository.js";

export class DrizzlePublicCatalogRepository implements PublicCatalogRepository {
  async findByRestaurantId(restaurantId: string) {
    const categories = await db.select({
      id: productCategories.id,
      name: productCategories.name,
      displayOrder: productCategories.displayOrder,
    }).from(productCategories).where(and(
      eq(productCategories.restaurantId, restaurantId),
      eq(productCategories.active, true),
    )).orderBy(asc(productCategories.displayOrder), asc(productCategories.id));

    const publicProducts = await db.select({
      id: products.id,
      categoryId: products.categoryId,
      name: products.name,
      description: products.description,
      price: products.price,
      displayOrder: products.displayOrder,
    }).from(products)
      .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
      .where(and(
        eq(products.restaurantId, restaurantId),
        eq(productCategories.restaurantId, restaurantId),
        eq(products.active, true),
        eq(productCategories.active, true),
      )).orderBy(asc(products.displayOrder), asc(products.id));

    const publicAddons = await db.select({
      id: addons.id,
      productId: products.id,
      name: addons.name,
      description: addons.description,
      price: addons.price,
    }).from(productAddons)
      .innerJoin(products, eq(productAddons.productId, products.id))
      .innerJoin(productCategories, eq(products.categoryId, productCategories.id))
      .innerJoin(addons, eq(productAddons.addonId, addons.id))
      .where(and(
        eq(products.restaurantId, restaurantId),
        eq(productCategories.restaurantId, restaurantId),
        eq(addons.restaurantId, restaurantId),
        eq(products.active, true),
        eq(productCategories.active, true),
        eq(addons.active, true),
      )).orderBy(asc(products.id), asc(addons.name), asc(addons.id));

    return { categories, products: publicProducts, addons: publicAddons };
  }
}
