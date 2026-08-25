import {
  CreateOrderItemData,
  OrderItem,
  OrderItemsRepository,
} from "./order-items-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryOrderItemsRepository implements OrderItemsRepository {
  public items: OrderItem[] = [];

  async createMany(data: CreateOrderItemData[]): Promise<OrderItem[]> {
    const newItems: OrderItem[] = data.map((item) => {
      const { addons, ...rest } = item;

      return {
        ...rest,
        id: randomUUID(),
        createdAt: new Date(),

        addons: addons?.map((addon) => ({
          ...addon,
          id: randomUUID(),
          createdAt: new Date(),
        })),
      };
    });

    this.items.push(...newItems);
    return newItems;
  }

  async findManyByOrderIds(orderIds: string[]): Promise<OrderItem[]> {
    if (orderIds.length === 0) return [];
    return this.items.filter((item) => orderIds.includes(item.orderId));
  }

  async hasByProductId(productId: string): Promise<boolean> {
    return this.items.some((item) => item.productId === productId);
  }
}
