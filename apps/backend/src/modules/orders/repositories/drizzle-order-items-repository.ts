import {
  CreateOrderItemData,
  OrderItem,
  OrderItemsRepository,
} from "./order-items-repository.js";

import { db } from "../../../db/index.js";
import { inArray } from "drizzle-orm";
import { orderItems } from "../../../db/schema/index.js";

export class DrizzleOrderItemsRepository implements OrderItemsRepository {
  constructor(private readonly client: any = db) {}

  async createMany(data: CreateOrderItemData[]): Promise<OrderItem[]> {
    return await this.client.insert(orderItems).values(data).returning();
  }

  async findManyByOrderIds(orderIds: string[]): Promise<OrderItem[]> {
    if (orderIds.length === 0) return [];

    return await this.client
      .select()
      .from(orderItems)
      .where(inArray(orderItems.orderId, orderIds));
  }
}
