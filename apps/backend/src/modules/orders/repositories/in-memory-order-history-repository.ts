import {
  CreateOrderHistoryData,
  OrderHistory,
  OrderHistoryRepository,
} from "./order-history-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryOrderHistoryRepository implements OrderHistoryRepository {
  public items: OrderHistory[] = [];

  async create(data: CreateOrderHistoryData): Promise<OrderHistory> {
    const history: OrderHistory = {
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.items.push(history);
    return history;
  }

  async findManyByOrderId(orderId: string): Promise<OrderHistory[]> {
    return this.items
      .filter((history) => history.orderId === orderId)
      .sort((a, b) => {
        const dateDiff = a.createdAt.getTime() - b.createdAt.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.id.localeCompare(b.id);
      });
  }
}
