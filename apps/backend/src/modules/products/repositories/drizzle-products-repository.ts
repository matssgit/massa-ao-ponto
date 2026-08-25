import {
  CreateProductData,
  FindManyProductsParams,
  Product,
  ProductsRepository,
  UpdateProductData,
} from "./products-repository.js";
import { and, asc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { products } from "../../../db/schema/index.js";

export class DrizzleProductsRepository implements ProductsRepository {
  constructor(private readonly client: typeof db = db) {}

  async create(data: CreateProductData): Promise<Product> {
    const [product] = await this.client
      .insert(products)
      .values(data)
      .returning();
    return product;
  }

  async findById(id: string): Promise<Product | null> {
    const [product] = await this.client
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product || null;
  }

  async findMany({
    restaurantId,
    categoryId,
    active,
  }: FindManyProductsParams): Promise<Product[]> {
    const conditions = [eq(products.restaurantId, restaurantId)];

    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    if (active !== undefined) {
      conditions.push(eq(products.active, active));
    }

    return await this.client
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.displayOrder), asc(products.id));
  }

  async update(id: string, data: UpdateProductData): Promise<Product> {
    const [updated] = await this.client
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(products).where(eq(products.id, id));
  }
}
