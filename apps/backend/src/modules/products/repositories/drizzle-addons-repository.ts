import {
  Addon,
  AddonsRepository,
  CreateAddonData,
  FindManyAddonsParams,
  UpdateAddonData,
} from "./addons-repository.js";
import { and, asc, eq } from "drizzle-orm";

import { addons } from "../../../db/schema/index.js";
import { db } from "../../../db/index.js";

export class DrizzleAddonsRepository implements AddonsRepository {
  constructor(private readonly client: typeof db = db) {}

  async create(data: CreateAddonData): Promise<Addon> {
    const [addon] = await this.client.insert(addons).values(data).returning();
    return addon;
  }

  async findById(id: string): Promise<Addon | null> {
    const [addon] = await this.client
      .select()
      .from(addons)
      .where(eq(addons.id, id));
    return addon || null;
  }

  async findByIdAndRestaurantId(
    addonId: string,
    restaurantId: string,
  ): Promise<Addon | null> {
    const [addon] = await this.client
      .select()
      .from(addons)
      .where(
        and(eq(addons.id, addonId), eq(addons.restaurantId, restaurantId)),
      );
    return addon || null;
  }

  async findMany({
    restaurantId,
    active,
  }: FindManyAddonsParams): Promise<Addon[]> {
    const conditions = [eq(addons.restaurantId, restaurantId)];

    if (active !== undefined) {
      conditions.push(eq(addons.active, active));
    }

    return await this.client
      .select()
      .from(addons)
      .where(and(...conditions))
      .orderBy(asc(addons.name), asc(addons.id));
  }

  async update(id: string, data: UpdateAddonData): Promise<Addon> {
    const [updated] = await this.client
      .update(addons)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(addons.id, id))
      .returning();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.client.delete(addons).where(eq(addons.id, id));
  }
}
