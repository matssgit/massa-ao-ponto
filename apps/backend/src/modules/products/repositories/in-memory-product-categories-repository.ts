import {
  CreateProductCategoryData,
  ProductCategoriesRepository,
  ProductCategory,
  UpdateProductCategoryData,
} from "./product-categories-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryProductCategoriesRepository implements ProductCategoriesRepository {
  public items: ProductCategory[] = [];

  async create(data: CreateProductCategoryData): Promise<ProductCategory> {
    const category: ProductCategory = {
      id: randomUUID(),
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description ?? null,
      active: true,
      displayOrder: data.displayOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(category);
    return category;
  }

  async findMany(restaurantId: string): Promise<ProductCategory[]> {
    return this.items
      .filter((item) => item.restaurantId === restaurantId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async findById(id: string): Promise<ProductCategory | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async findByIdAndRestaurantId(
    categoryId: string,
    restaurantId: string,
  ): Promise<ProductCategory | null> {
    return (
      this.items.find(
        (item) =>
          item.id === categoryId && item.restaurantId === restaurantId,
      ) || null
    );
  }

  async update(
    id: string,
    data: UpdateProductCategoryData,
  ): Promise<ProductCategory> {
    const index = this.items.findIndex((item) => item.id === id);
    const updated = { ...this.items[index] };

    if (data.name !== undefined) updated.name = data.name;
    if (data.description !== undefined)
      updated.description = data.description ?? null;
    if (data.displayOrder !== undefined)
      updated.displayOrder = data.displayOrder;
    if (data.active !== undefined) updated.active = data.active;

    updated.updatedAt = new Date();
    this.items[index] = updated;

    return updated;
  }

  async delete(id: string): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index >= 0) this.items.splice(index, 1);
  }
}
