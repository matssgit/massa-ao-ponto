import {
  CreateDeliveryHistoryData,
  DeliveryHistoryRepository,
} from "./delivery-history-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryDeliveryHistoryRepository implements DeliveryHistoryRepository {
  public items: any[] = [];

  async create(data: CreateDeliveryHistoryData): Promise<void> {
    this.items.push({
      id: randomUUID(),
      ...data,
      createdAt: new Date(),
    });
  }
}
