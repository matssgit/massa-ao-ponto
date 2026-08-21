import {
  CreateProductCategoryData,
  ProductCategoriesRepository,
  ProductCategory,
} from "./product-categories-repository.js";
import { asc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { productCategories } from "../../../db/schema/index.js";

export class DrizzleProductCategoriesRepository implements ProductCategoriesRepository {
  async create(data: CreateProductCategoryData): Promise<ProductCategory> {
    const [category] = await db
      .insert(productCategories)
      .values(data)
      .returning();
    return category;
  }

  async findManyByRestaurantId(
    restaurantId: string,
  ): Promise<ProductCategory[]> {
    return await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.restaurantId, restaurantId))
      .orderBy(asc(productCategories.displayOrder), asc(productCategories.id));
  }

  async findById(id: string): Promise<ProductCategory | null> {
    const result = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, id));

    return result[0] || null;
  }
}
