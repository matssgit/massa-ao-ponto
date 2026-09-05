import {
  CreateRestaurantInput,
  Restaurant,
  RestaurantsRepository,
  UpdateRestaurantInput,
} from "./restaurants-repository.js";

import { db } from "../../../db/index.js";
import { and, eq } from "drizzle-orm";
import { restaurants } from "../../../db/schema/index.js";

function mapRestaurant(restaurant: typeof restaurants.$inferSelect): Restaurant {
  return { ...restaurant, phone: restaurant.phone ?? "" };
}

export class DrizzleRestaurantsRepository implements RestaurantsRepository {
  constructor(
    private readonly client: Pick<typeof db, "insert" | "select" | "update"> = db,
  ) {}

  async create(data: CreateRestaurantInput): Promise<Restaurant> {
    const [restaurant] = await this.client.insert(restaurants).values(data).returning();
    return mapRestaurant(restaurant);
  }

  async findById(id: string): Promise<Restaurant | null> {
    const [restaurant] = await this.client.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant ? mapRestaurant(restaurant) : null;
  }

  async findBySlug(slug: string): Promise<Restaurant | null> {
    const [restaurant] = await this.client.select().from(restaurants).where(eq(restaurants.slug, slug));
    return restaurant ? mapRestaurant(restaurant) : null;
  }

  async findPublishedBySlug(slug: string): Promise<Restaurant | null> {
    const [restaurant] = await this.client
      .select()
      .from(restaurants)
      .where(and(eq(restaurants.slug, slug), eq(restaurants.publicEnabled, true)));
    return restaurant ? mapRestaurant(restaurant) : null;
  }

  async findAll(): Promise<Restaurant[]> {
    const results = await this.client.select().from(restaurants);
    return results.map(mapRestaurant);
  }

  async update(id: string, data: UpdateRestaurantInput): Promise<Restaurant | null> {
    const [restaurant] = await this.client
      .update(restaurants)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(restaurants.id, id))
      .returning();
    return restaurant ? mapRestaurant(restaurant) : null;
  }
}