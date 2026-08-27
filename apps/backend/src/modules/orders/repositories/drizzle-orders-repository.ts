import {
  CreateOrderData,
  ListOrdersFilters,
  Order,
  OrderPaymentStatus,
  OrderStatus,
  OrdersRepository,
} from "./orders-repository.js";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { orders } from "../../../db/schema/index.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleOrdersRepository implements OrdersRepository {
  constructor(private readonly client: typeof db | Transaction = db) {}

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

  async findByIdAndRestaurantId(
    orderId: string,
    restaurantId: string,
  ): Promise<Order | null> {
    const [order] = await this.client
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.restaurantId, restaurantId),
        ),
      );

    return order || null;
  }

  async findByIdAndRestaurantIdForUpdate(
    orderId: string,
    restaurantId: string,
  ): Promise<Order | null> {
    const [order] = await this.client
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.id, orderId),
          eq(orders.restaurantId, restaurantId),
        ),
      )
      .for("update");

    return order || null;
  }

  async findMany(filters: ListOrdersFilters): Promise<Order[]> {
    const conditions = [eq(orders.restaurantId, filters.restaurantId)];

    if (filters.status) conditions.push(eq(orders.status, filters.status));
    if (filters.type) conditions.push(eq(orders.type, filters.type));
    if (filters.customerId)
      conditions.push(eq(orders.customerId, filters.customerId));
    if (filters.startsAt)
      conditions.push(gte(orders.createdAt, filters.startsAt));
    if (filters.endsAt) conditions.push(lte(orders.createdAt, filters.endsAt));

    return await this.client
      .select()
      .from(orders)
      .where(and(...conditions))
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);
  }

  async findByIdForUpdate(id: string): Promise<Order | null> {
    const result = await this.client
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .for("update");

    return result[0] || null;
  }

  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await this.client
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: OrderPaymentStatus,
  ): Promise<void> {
    await this.client
      .update(orders)
      .set({ paymentStatus, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  async findActiveDineInOrderByTableId(tableId: string): Promise<Order | null> {
    const result = await this.client
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.tableId, tableId),
          inArray(orders.status, [
            "PENDING",
            "CONFIRMED",
            "PREPARING",
            "READY",
          ]),
        ),
      );
    return result[0] || null;
  }
}
