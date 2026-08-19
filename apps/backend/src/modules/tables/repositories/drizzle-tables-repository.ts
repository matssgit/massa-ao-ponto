import {
  CreateTableInput,
  Table,
  TablesRepository,
} from "./tables-repository.js";
import { and, eq, gte } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { tables } from "../../../db/index.js";

export class DrizzleTablesRepository implements TablesRepository {
  async create(data: CreateTableInput): Promise<Table> {
    const [table] = await db.insert(tables).values(data).returning();
    return table;
  }

  async findByRestaurantId(restaurantId: string): Promise<Table[]> {
    return db
      .select()
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId));
  }

  async findByRestaurantAndNumber(
    restaurantId: string,
    number: string,
  ): Promise<Table | null> {
    const [table] = await db
      .select()
      .from(tables)
      .where(
        and(eq(tables.restaurantId, restaurantId), eq(tables.number, number)),
      );

    return table || null;
  }

  constructor(private readonly client: any = db) {}

  async findByIdForUpdate(id: string): Promise<Table | null> {
    const result = await this.client
      .select()
      .from(tables)
      .where(eq(tables.id, id))
      .for("update");
    return result[0] || null;
  }

  async findManyActiveByRestaurantId(
    restaurantId: string,
    minCapacity?: number,
  ): Promise<Table[]> {
    const conditions = [
      eq(tables.restaurantId, restaurantId),
      eq(tables.active, true),
    ];

    if (minCapacity) {
      conditions.push(gte(tables.capacity, minCapacity));
    }

    return await this.client
      .select()
      .from(tables)
      .where(and(...conditions));
  }
}
