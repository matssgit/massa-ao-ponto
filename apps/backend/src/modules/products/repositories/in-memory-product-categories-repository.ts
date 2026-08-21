import {
  CreateProductCategoryData,
  ProductCategoriesRepository,
  ProductCategory,
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

  async findManyByRestaurantId(
    restaurantId: string,
  ): Promise<ProductCategory[]> {
    return this.items
      .filter((item) => item.restaurantId === restaurantId)
      .sort((a, b) => {
        const orderDiff = a.displayOrder - b.displayOrder;
        if (orderDiff !== 0) {
          return orderDiff;
        }
        return a.id.localeCompare(b.id);
      });
  }

  async findById(id: string): Promise<ProductCategory | null> {
    return this.items.find((item) => item.id === id) || null;
  }
}
