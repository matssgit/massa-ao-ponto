import {
  CreateDeliveryHistoryData,
  DeliveryHistory,
  DeliveryHistoryRepository,
} from "./delivery-history-repository.js";
import { asc, eq } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { deliveryHistory } from "../../../db/schema/index.js";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class DrizzleDeliveryHistoryRepository implements DeliveryHistoryRepository {
  constructor(private readonly client: typeof db | Transaction = db) {}

  async create(data: CreateDeliveryHistoryData): Promise<void> {
    await this.client.insert(deliveryHistory).values(data);
  }

  async findManyByDeliveryId(
    deliveryId: string,
  ): Promise<DeliveryHistory[]> {
    return await this.client
      .select()
      .from(deliveryHistory)
      .where(eq(deliveryHistory.deliveryId, deliveryId))
      .orderBy(asc(deliveryHistory.createdAt), asc(deliveryHistory.id));
  }
}
