import {
  Addon,
  AddonsRepository,
  CreateAddonData,
  FindManyAddonsParams,
  UpdateAddonData,
} from "./addons-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryAddonsRepository implements AddonsRepository {
  public items: Addon[] = [];

  async create(data: CreateAddonData): Promise<Addon> {
    const addon: Addon = {
      id: randomUUID(),
      restaurantId: data.restaurantId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(addon);
    return addon;
  }

  async findById(id: string): Promise<Addon | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async findMany({
    restaurantId,
    active,
  }: FindManyAddonsParams): Promise<Addon[]> {
    return this.items
      .filter((item) => {
        if (item.restaurantId !== restaurantId) return false;
        if (active !== undefined && item.active !== active) return false;
        return true;
      })
      .sort((a, b) => {
        const nameComparison = a.name.localeCompare(b.name);
        if (nameComparison === 0) {
          return a.id.localeCompare(b.id);
        }
        return nameComparison;
      });
  }

  async update(id: string, data: UpdateAddonData): Promise<Addon> {
    const index = this.items.findIndex((item) => item.id === id);
    const updated = { ...this.items[index] };

    if (data.name !== undefined) updated.name = data.name;
    if (data.description !== undefined)
      updated.description = data.description ?? null;
    if (data.price !== undefined) updated.price = data.price;
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
