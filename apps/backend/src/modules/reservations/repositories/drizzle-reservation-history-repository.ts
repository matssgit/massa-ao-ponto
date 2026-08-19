import {
  CreateReservationHistoryData,
  ReservationHistory,
  ReservationHistoryRepository,
} from "./reservation-history-repository.js";

import { db } from "../../../db/index.js";
import { reservationHistory } from "../../../db/schema/index.js";

export class DrizzleReservationHistoryRepository implements ReservationHistoryRepository {
  constructor(private readonly client: any = db) {}

  async create(
    data: CreateReservationHistoryData,
  ): Promise<ReservationHistory> {
    const result = await this.client
      .insert(reservationHistory)
      .values(data)
      .returning();
    return result[0];
  }
}
