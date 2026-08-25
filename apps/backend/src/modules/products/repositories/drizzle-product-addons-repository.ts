import {
  CreateProductAddonData,
  ProductAddonsRepository,
} from "./product-addons-repository.js";
import { addons, productAddons } from "../../../db/schema/index.js";
import { and, asc, eq } from "drizzle-orm";

import { Addon } from "./addons-repository.js";
import { db } from "../../../db/index.js";

export class DrizzleProductAddonsRepository implements ProductAddonsRepository {
  constructor(private readonly client: typeof db = db) {}

  async create(data: CreateProductAddonData): Promise<void> {
    await this.client.insert(productAddons).values(data);
  }

  async delete(data: CreateProductAddonData): Promise<void> {
    await this.client
      .delete(productAddons)
      .where(
        and(
          eq(productAddons.productId, data.productId),
          eq(productAddons.addonId, data.addonId),
        ),
      );
  }

  async exists(data: CreateProductAddonData): Promise<boolean> {
    const [result] = await this.client
      .select({ productId: productAddons.productId })
      .from(productAddons)
      .where(
        and(
          eq(productAddons.productId, data.productId),
          eq(productAddons.addonId, data.addonId),
        ),
      )
      .limit(1);

    return !!result;
  }

  async findAddonsByProductId(productId: string): Promise<Addon[]> {
    const results = await this.client
      .select({
        addon: addons,
      })
      .from(productAddons)
      .innerJoin(addons, eq(productAddons.addonId, addons.id))
      .where(eq(productAddons.productId, productId))
      .orderBy(asc(addons.name), asc(addons.id));

    return results.map((row) => row.addon);
  }
}
