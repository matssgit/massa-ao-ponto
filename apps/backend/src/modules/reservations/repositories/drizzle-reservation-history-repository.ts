import {
  CreateReservationHistoryData,
  ReservationHistory,
  ReservationHistoryRepository,
} from "./reservation-history-repository.js";
import { asc, eq } from "drizzle-orm";

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

  async findByReservationId(
    reservationId: string,
  ): Promise<ReservationHistory[]> {
    return await this.client
      .select()
      .from(reservationHistory)
      .where(eq(reservationHistory.reservationId, reservationId))
      .orderBy(asc(reservationHistory.createdAt), asc(reservationHistory.id));
  }
}
