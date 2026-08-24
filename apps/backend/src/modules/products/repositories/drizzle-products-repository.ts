import {
  CreateProductData,
  FindManyProductsFilters,
  Product,
  ProductsRepository,
  UpdateProductData,
} from "./products-repository.js";
import { and, asc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { products } from "../../../db/schema/index.js";

export class DrizzleProductsRepository implements ProductsRepository {
  constructor(private readonly client: any = db) {}

  async create(data: CreateProductData): Promise<Product> {
    const [product] = await this.client
      .insert(products)
      .values(data)
      .returning();
    return product;
  }

  async findMany({
    restaurantId,
    categoryId,
    active,
  }: FindManyProductsFilters): Promise<Product[]> {
    const conditions = [eq(products.restaurantId, restaurantId)];

    if (categoryId) conditions.push(eq(products.categoryId, categoryId));
    if (active !== undefined) conditions.push(eq(products.active, active));

    return await this.client
      .select()
      .from(products)
      .where(and(...conditions))
      .orderBy(asc(products.displayOrder));
  }

  async findById(id: string): Promise<Product | null> {
    const [product] = await this.client
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product || null;
  }

  async update(id: string, data: UpdateProductData): Promise<Product> {
    const [updated] = await this.client
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();

    return updated;
  }
}
