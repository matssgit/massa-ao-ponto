import {
  CreateTableInput,
  Table,
  TablesRepository,
} from "./tables-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryTablesRepository implements TablesRepository {
  public items: Table[] = [];

  async create(data: CreateTableInput): Promise<Table> {
    const table: Table = {
      id: randomUUID(),
      restaurantId: data.restaurantId,
      number: data.number,
      capacity: data.capacity,
      type: data.type,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.items.push(table);
    return table;
  }

  async findByRestaurantId(restaurantId: string): Promise<Table[]> {
    return this.items.filter((item) => item.restaurantId === restaurantId);
  }
}
