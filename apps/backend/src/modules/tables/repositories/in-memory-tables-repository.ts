import {
  CreateTableInput,
  Table,
  TablesRepository,
  UpdateTableInput,
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
    return this.items
      .filter((item) => item.restaurantId === restaurantId)
      .sort((a, b) => {
        const numberComparison = a.number.localeCompare(b.number);
        if (numberComparison !== 0) return numberComparison;
        return a.id.localeCompare(b.id);
      });
  }

  async findManyByIdsAndRestaurantId(
    ids: string[],
    restaurantId: string,
  ): Promise<Table[]> {
    return this.items.filter(
      (item) =>
        ids.includes(item.id) && item.restaurantId === restaurantId,
    );
  }

  async findByRestaurantAndNumber(
    restaurantId: string,
    number: string,
  ): Promise<Table | null> {
    const table = this.items.find(
      (item) => item.restaurantId === restaurantId && item.number === number,
    );
    return table || null;
  }

  async findByIdAndRestaurantId(
    tableId: string,
    restaurantId: string,
  ): Promise<Table | null> {
    return (
      this.items.find(
        (item) =>
          item.id === tableId && item.restaurantId === restaurantId,
      ) || null
    );
  }

  async updateByIdAndRestaurantId(
    tableId: string,
    restaurantId: string,
    data: UpdateTableInput,
  ): Promise<Table | null> {
    const table = await this.findByIdAndRestaurantId(tableId, restaurantId);
    if (!table) return null;

    Object.assign(table, data, { updatedAt: new Date() });
    return table;
  }

  async findByIdForUpdate(id: string): Promise<Table | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async findManyActiveByRestaurantId(
    restaurantId: string,
    minCapacity?: number,
  ): Promise<Table[]> {
    return this.items.filter((table) => {
      if (table.restaurantId !== restaurantId) return false;
      if (!table.active) return false;
      if (minCapacity && table.capacity < minCapacity) return false;
      return true;
    });
  }
}
