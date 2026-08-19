import {
  CreateReservationHistoryData,
  ReservationHistory,
  ReservationHistoryRepository,
} from "./reservation-history-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryReservationHistoryRepository implements ReservationHistoryRepository {
  public items: ReservationHistory[] = [];

  async create(
    data: CreateReservationHistoryData,
  ): Promise<ReservationHistory> {
    const history: ReservationHistory = {
      id: randomUUID(),
      reservationId: data.reservationId,
      action: data.action,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
      observation: data.observation || null,
      createdAt: new Date(),
    };

    this.items.push(history);
    return history;
  }

  async findByReservationId(
    reservationId: string,
  ): Promise<ReservationHistory[]> {
    return this.items
      .filter((item) => item.reservationId === reservationId)
      .sort((a, b) => {
        const timeComparison = a.createdAt.getTime() - b.createdAt.getTime();
        if (timeComparison !== 0) {
          return timeComparison;
        }
        return a.id.localeCompare(b.id);
      });
  }
}
