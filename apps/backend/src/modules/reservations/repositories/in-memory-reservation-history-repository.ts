import {
  CreateReservationHistoryData,
  ReservationHistory,
  ReservationHistoryRepository,
} from "./reservation-history-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryReservationHistoryRepository implements ReservationHistoryRepository {
  public items: CreateReservationHistoryData[] = [];

  async create(
    data: CreateReservationHistoryData,
  ): Promise<ReservationHistory> {
    this.items.push(data);
    return { id: randomUUID() };
  }
}
