import {
  CreateOrderData,
  ListOrdersFilters,
  Order,
  OrdersRepository,
} from "./orders-repository.js";
import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { orders } from "../../../db/schema/index.js";

export class DrizzleOrdersRepository implements OrdersRepository {
  constructor(private readonly client: any = db) {}

  async create(data: CreateOrderData): Promise<Order> {
    const [order] = await this.client.insert(orders).values(data).returning();
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    const result = await this.client
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    return result[0] || null;
  }

  async findMany(filters: ListOrdersFilters): Promise<Order[]> {
    const conditions = [eq(orders.restaurantId, filters.restaurantId)];

    if (filters.status)
      conditions.push(eq(orders.status, filters.status as any));
    if (filters.type) conditions.push(eq(orders.type, filters.type as any));
    if (filters.customerId)
      conditions.push(eq(orders.customerId, filters.customerId));
    if (filters.startsAt)
      conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    return await this.client
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt), desc(orders.id));
  }

  async findByIdForUpdate(id: string): Promise<Order | null> {
    const result = await this.client
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update"); // Aplica o Row-Level Locking do Postgres

    return result[0] || null;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.client
      .update(orders)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }
}
