import {
  CreateProductData,
  FindManyProductsFilters,
  Product,
  ProductsRepository,
} from "./products-repository.js";
import { and, asc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { products } from "../../../db/schema/index.js";

export class DrizzleProductsRepository implements ProductsRepository {
  async create(data: CreateProductData): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async findById(id: string): Promise<Product | null> {
    const result = await db.select().from(products).where(eq(products.id, id));
    return result[0] || null;
  }

  async findMany(filters: FindManyProductsFilters): Promise<Product[]> {
    const queryConditions = [eq(products.restaurantId, filters.restaurantId)];

    if (filters.categoryId) {
      queryConditions.push(eq(products.categoryId, filters.categoryId));
    }

    if (filters.active !== undefined) {
      queryConditions.push(eq(products.active, filters.active));
    }

    return await db
      .select()
      .from(products)
      .where(and(...queryConditions))
      .orderBy(asc(products.displayOrder), asc(products.id));
  }
}
