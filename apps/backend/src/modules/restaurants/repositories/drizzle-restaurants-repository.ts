import {
  CreateRestaurantInput,
  Restaurant,
  RestaurantsRepository,
} from "./restaurants-repository.js";

import { db } from "../../../db/index.js";
import { eq } from "drizzle-orm";
import { restaurants } from "../../../db/schema/index.js";

export class DrizzleRestaurantsRepository implements RestaurantsRepository {
  async create(data: CreateRestaurantInput): Promise<Restaurant> {
    const [restaurant] = await db.insert(restaurants).values(data).returning();

    return {
      ...restaurant,

      phone: restaurant.phone ?? "",
    };
  }

  async findById(id: string): Promise<Restaurant | null> {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, id));

    if (!restaurant) {
      return null;
    }

    return {
      ...restaurant,
      phone: restaurant.phone ?? "",
    };
  }

  async findAll(): Promise<Restaurant[]> {
    const results = await db.select().from(restaurants);

    return results.map((restaurant) => ({
      ...restaurant,
      phone: restaurant.phone ?? "",
    }));
  }
}
