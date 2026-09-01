import {
  CreateTableInput,
  Table,
  TablesRepository,
  UpdateTableInput,
} from "./tables-repository.js";
import { and, asc, eq, gte, inArray } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { tables } from "../../../db/index.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleTablesRepository implements TablesRepository {
  constructor(private readonly client: typeof db | Transaction = db) {}

  async create(data: CreateTableInput): Promise<Table> {
    const [table] = await this.client.insert(tables).values(data).returning();
    return table;
  }

  async findByRestaurantId(restaurantId: string): Promise<Table[]> {
    return this.client
      .select()
      .from(tables)
      .where(eq(tables.restaurantId, restaurantId))
      .orderBy(asc(tables.number), asc(tables.id));
  }

  async findManyByIdsAndRestaurantId(
    ids: string[],
    restaurantId: string,
  ): Promise<Table[]> {
    if (ids.length === 0) return [];

    return await this.client
      .select()
      .from(tables)
      .where(
        and(
          inArray(tables.id, ids),
          eq(tables.restaurantId, restaurantId),
        ),
      );
  }

  async findByRestaurantAndNumber(
    restaurantId: string,
    number: string,
  ): Promise<Table | null> {
    const [table] = await this.client
      .select()
      .from(tables)
      .where(
        and(eq(tables.restaurantId, restaurantId), eq(tables.number, number)),
      );

    return table || null;
  }

  async findByIdAndRestaurantId(
    tableId: string,
    restaurantId: string,
  ): Promise<Table | null> {
    const [table] = await this.client
      .select()
      .from(tables)
      .where(
        and(
          eq(tables.id, tableId),
          eq(tables.restaurantId, restaurantId),
        ),
      );

    return table || null;
  }

  async updateByIdAndRestaurantId(
    tableId: string,
    restaurantId: string,
    data: UpdateTableInput,
  ): Promise<Table | null> {
    const [table] = await this.client
      .update(tables)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(tables.id, tableId),
          eq(tables.restaurantId, restaurantId),
        ),
      )
      .returning();

    return table || null;
  }

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
