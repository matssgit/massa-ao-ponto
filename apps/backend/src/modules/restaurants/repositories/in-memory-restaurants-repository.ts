import {
  CreateRestaurantInput,
  Restaurant,
  RestaurantsRepository,
  UpdateRestaurantInput,
} from "./restaurants-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryRestaurantsRepository implements RestaurantsRepository {
  public items: Restaurant[] = [];

  async create(data: CreateRestaurantInput): Promise<Restaurant> {
    const restaurant: Restaurant = {
      id: randomUUID(),
      name: data.name,
      address: data.address,
      phone: data.phone,
      timezone: data.timezone,
      slug: null,
      publicEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.items.push(restaurant);
    return restaurant;
  }

  async findById(id: string): Promise<Restaurant | null> {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    return this.items.find((item) => item.slug === slug) ?? null;
  }

  async findPublishedBySlug(slug: string): Promise<Restaurant | null> {
    return this.items.find((item) => item.slug === slug && item.publicEnabled) ?? null;
  }

  async findAll(): Promise<Restaurant[]> {
    return this.items;
  }

  async update(id: string, data: UpdateRestaurantInput): Promise<Restaurant | null> {
    const restaurant = await this.findById(id);
    if (!restaurant) return null;
    Object.assign(restaurant, data, { updatedAt: new Date() });
    return restaurant;
  }
}