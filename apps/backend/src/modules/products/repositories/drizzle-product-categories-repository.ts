import {
  CreateProductCategoryData,
  ProductCategoriesRepository,
  ProductCategory,
  UpdateProductCategoryData,
} from "./product-categories-repository.js";
import { asc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { productCategories } from "../../../db/schema/index.js";

export class DrizzleProductCategoriesRepository implements ProductCategoriesRepository {
  constructor(private readonly client: any = db) {}

  async create(data: CreateProductCategoryData): Promise<ProductCategory> {
    const [category] = await this.client
      .insert(productCategories)
      .values(data)
      .returning();
    return category;
  }

  async findMany(restaurantId: string): Promise<ProductCategory[]> {
    return await this.client
      .select()
      .from(productCategories)
      .where(eq(productCategories.restaurantId, restaurantId))
      .orderBy(asc(productCategories.displayOrder));
  }

  async findById(id: string): Promise<ProductCategory | null> {
    const [category] = await this.client
      .select()
      .from(productCategories)
      .where(eq(productCategories.id, id));
    return category || null;
  }

  async update(
    id: string,
    data: UpdateProductCategoryData,
  ): Promise<ProductCategory> {
    const [updated] = await this.client
      .update(productCategories)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productCategories.id, id))
      .returning();
    return updated;
  }
}
