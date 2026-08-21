import {
  CreateOrderHistoryData,
  OrderHistory,
  OrderHistoryRepository,
} from "./order-history-repository.js";

import { db } from "../../../db/index.js";
import { orderHistory } from "../../../db/schema/index.js";

export class DrizzleOrderHistoryRepository implements OrderHistoryRepository {
  constructor(private readonly client: any = db) {}

  async create(data: CreateOrderHistoryData): Promise<OrderHistory> {
    const [history] = await this.client
      .insert(orderHistory)
      .values(data)
      .returning();
    return history;
  }
}
