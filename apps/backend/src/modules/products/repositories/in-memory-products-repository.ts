import {
  CreateProductData,
  FindManyProductsFilters,
  Product,
  ProductsRepository,
  UpdateProductData,
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
      displayOrder: data.displayOrder,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(product);
    return product;
  }

  async findMany({
    restaurantId,
    categoryId,
    active,
  }: FindManyProductsFilters): Promise<Product[]> {
    return this.items
      .filter((item) => {
        if (item.restaurantId !== restaurantId) return false;
        if (categoryId && item.categoryId !== categoryId) return false;
        if (active !== undefined && item.active !== active) return false;
        return true;
      })
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async findById(id: string): Promise<Product | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async update(id: string, data: UpdateProductData): Promise<Product> {
    const index = this.items.findIndex((item) => item.id === id);

    const updated = { ...this.items[index] };
    if (data.name !== undefined) updated.name = data.name;
    if (data.description !== undefined)
      updated.description = data.description ?? null;
    if (data.price !== undefined) updated.price = data.price;
    if (data.categoryId !== undefined) updated.categoryId = data.categoryId;
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
