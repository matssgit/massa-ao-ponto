import {
  CreateDeliveryHistoryData,
  DeliveryHistoryRepository,
} from "./delivery-history-repository.js";

import { db } from "../../../db/index.js";
import { deliveryHistory } from "../../../db/schema/index.js";

export class DrizzleDeliveryHistoryRepository implements DeliveryHistoryRepository {
  constructor(private readonly client: any = db) {}

  async create(data: CreateDeliveryHistoryData): Promise<void> {
    await this.client.insert(deliveryHistory).values(data);
  }
}
