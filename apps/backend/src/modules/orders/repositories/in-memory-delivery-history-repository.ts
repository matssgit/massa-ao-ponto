import {
  CreateDeliveryHistoryData,
  DeliveryHistory,
  DeliveryHistoryRepository,
} from "./delivery-history-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryDeliveryHistoryRepository implements DeliveryHistoryRepository {
  public items: DeliveryHistory[] = [];

  async create(data: CreateDeliveryHistoryData): Promise<void> {
    const history: DeliveryHistory = {
      id: randomUUID(),
      ...data,
      observation: data.observation ?? null,
      createdAt: new Date(),
    };
    this.items.push(history);
  }

  async findManyByDeliveryId(
    deliveryId: string,
  ): Promise<DeliveryHistory[]> {
    return this.items
      .filter((history) => history.deliveryId === deliveryId)
      .sort((a, b) => {
        const dateDiff = a.createdAt.getTime() - b.createdAt.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.id.localeCompare(b.id);
      });
  }
}
