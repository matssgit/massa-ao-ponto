import {
  CreateProductAddonData,
  ProductAddonsRepository,
} from "./product-addons-repository.js";

import { Addon } from "./addons-repository.js";
import { InMemoryAddonsRepository } from "./in-memory-addons-repository.js";

export class InMemoryProductAddonsRepository implements ProductAddonsRepository {
  public items: { productId: string; addonId: string; createdAt: Date }[] = [];

  constructor(private readonly addonsRepository: InMemoryAddonsRepository) {}

  async create(data: CreateProductAddonData): Promise<void> {
    this.items.push({
      productId: data.productId,
      addonId: data.addonId,
      createdAt: new Date(),
    });
  }

  async delete(data: CreateProductAddonData): Promise<void> {
    const index = this.items.findIndex(
      (item) =>
        item.productId === data.productId && item.addonId === data.addonId,
    );
    if (index >= 0) this.items.splice(index, 1);
  }

  async exists(data: CreateProductAddonData): Promise<boolean> {
    return this.items.some(
      (item) =>
        item.productId === data.productId && item.addonId === data.addonId,
    );
  }

  async findAddonsByProductId(productId: string): Promise<Addon[]> {
    const addonIds = this.items
      .filter((item) => item.productId === productId)
      .map((item) => item.addonId);

    const addons = this.addonsRepository.items.filter((addon) =>
      addonIds.includes(addon.id),
    );

    return addons.sort((a, b) => {
      const nameComparison = a.name.localeCompare(b.name);
      if (nameComparison === 0) {
        return a.id.localeCompare(b.id);
      }
      return nameComparison;
    });
  }
}
