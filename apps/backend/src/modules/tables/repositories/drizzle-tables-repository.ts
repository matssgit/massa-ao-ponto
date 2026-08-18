import {
  CreateTableInput,
  Table,
  TablesRepository,
} from "./tables-repository.js";

import { db } from "../../../db/index.js";
import { eq } from "drizzle-orm";
import { tables } from "../../../db/schema/tables.js";

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
}
