import {
  CreateOrderItemData,
  OrderItem,
  OrderItemsRepository,
} from "./order-items-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryOrderItemsRepository implements OrderItemsRepository {
  public items: OrderItem[] = [];

  async createMany(data: CreateOrderItemData[]): Promise<OrderItem[]> {
    const createdItems = data.map((d) => ({
      ...d,
      id: randomUUID(),
      createdAt: new Date(),
    }));
    this.items.push(...createdItems);
    return createdItems;
  }

  async findManyByOrderIds(orderIds: string[]): Promise<OrderItem[]> {
    return this.items.filter((item) => orderIds.includes(item.orderId));
  }
}
