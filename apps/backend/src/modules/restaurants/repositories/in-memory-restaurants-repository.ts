import {
  CreateRestaurantInput,
  Restaurant,
  RestaurantsRepository,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.items.push(restaurant);
    return restaurant;
  }

  async findById(id: string): Promise<Restaurant | null> {
    const restaurant = this.items.find((item) => item.id === id);
    return restaurant || null;
  }

  async findAll(): Promise<Restaurant[]> {
    return this.items;
  }
}
