import {
  CreateOrderHistoryData,
  OrderHistory,
  OrderHistoryRepository,
} from "./order-history-repository.js";
import { asc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { orderHistory } from "../../../db/schema/index.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleOrderHistoryRepository implements OrderHistoryRepository {
  constructor(private readonly client: typeof db | Transaction = db) {}

  async create(data: CreateOrderHistoryData): Promise<OrderHistory> {
    const [history] = await this.client
      .insert(orderHistory)
      .values(data)
      .returning();
    return history;
  }

  async findManyByOrderId(orderId: string): Promise<OrderHistory[]> {
    return await this.client
      .select()
      .from(orderHistory)
      .where(eq(orderHistory.orderId, orderId))
      .orderBy(asc(orderHistory.createdAt), asc(orderHistory.id));
  }
}
