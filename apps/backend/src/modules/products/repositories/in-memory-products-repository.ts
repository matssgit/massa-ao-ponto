import {
  CreateProductData,
  FindManyProductsFilters,
  Product,
  ProductsRepository,
} from "./products-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryProductsRepository implements ProductsRepository {
  public items: Product[] = [];

  async create(data: CreateProductData): Promise<Product> {
    const product: Product = {
      id: randomUUID(),
      restaurantId: data.restaurantId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      active: true,
      displayOrder: data.displayOrder,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.items.push(product);
    return product;
  }

  async findById(id: string): Promise<Product | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async findMany(filters: FindManyProductsFilters): Promise<Product[]> {
    return this.items
      .filter((item) => {
        if (item.restaurantId !== filters.restaurantId) return false;
        if (filters.categoryId && item.categoryId !== filters.categoryId)
          return false;
        if (filters.active !== undefined && item.active !== filters.active)
          return false;
        return true;
      })
      .sort((a, b) => {
        const orderDiff = a.displayOrder - b.displayOrder;
        if (orderDiff !== 0) return orderDiff;
        return a.id.localeCompare(b.id);
      });
  }
}
