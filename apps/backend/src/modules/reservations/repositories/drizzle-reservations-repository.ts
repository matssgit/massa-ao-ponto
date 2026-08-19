import {
  CreateReservationData,
  Reservation,
  ReservationsRepository,
} from "./reservations-repository.js";
import { and, eq, gt, inArray, lt } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { reservations } from "../../../db/schema/index.js";

export class DrizzleReservationsRepository implements ReservationsRepository {
  constructor(private readonly client: any = db) {}

  async create(data: CreateReservationData): Promise<Reservation> {
    const result = await this.client
      .insert(reservations)
      .values(data)
      .returning();
    return result[0];
  }

  async findConflictingReservation(
    tableId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Reservation | null> {
    const result = await this.client
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.tableId, tableId),
          inArray(reservations.status, ["SCHEDULED", "CONFIRMED"]),
          lt(reservations.startsAt, endsAt),
          gt(reservations.endsAt, startsAt),
        ),
      );

    return result[0] || null;
  }
}
