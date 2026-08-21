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
}
