import {
  CreateReservationData,
  FindManyReservationsFilters,
  Reservation,
  ReservationsRepository,
} from "./reservations-repository.js";
import { and, asc, eq, gt, gte, inArray, lt, lte } from "drizzle-orm";

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

  async findById(id: string): Promise<Reservation | null> {
    const result = await this.client
      .select()
      .from(reservations)
      .where(eq(reservations.id, id));
    return result[0] || null;
  }

  async findByIdAndRestaurantId(
    reservationId: string,
    restaurantId: string,
  ): Promise<Reservation | null> {
    const [reservation] = await this.client
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.restaurantId, restaurantId),
        ),
      );

    return reservation || null;
  }

  async findByIdAndRestaurantIdForUpdate(
    reservationId: string,
    restaurantId: string,
  ): Promise<Reservation | null> {
    const [reservation] = await this.client
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.id, reservationId),
          eq(reservations.restaurantId, restaurantId),
        ),
      )
      .for("update");

    return reservation || null;
  }

  async updateStatus(
    id: string,
    status: Reservation["status"],
  ): Promise<Reservation> {
    const result = await this.client
      .update(reservations)
      .set({ status, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return result[0];
  }

  async findManyByRestaurantId(
    filters: FindManyReservationsFilters,
  ): Promise<Reservation[]> {
    const conditions = [eq(reservations.restaurantId, filters.restaurantId)];

    if (filters.status) {
      conditions.push(eq(reservations.status, filters.status));
    }

    if (filters.startsAt) {
      conditions.push(gte(reservations.startsAt, filters.startsAt));
    }

    if (filters.endsAt) {
      conditions.push(lte(reservations.endsAt, filters.endsAt));
    }

    const result = await this.client
      .select()
      .from(reservations)
      .where(and(...conditions))
      .orderBy(asc(reservations.startsAt), asc(reservations.id));

    return result;
  }

  async findConflictingTableIds(
    restaurantId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<string[]> {
    const result = await this.client
      .select({ tableId: reservations.tableId })
      .from(reservations)
      .where(
        and(
          eq(reservations.restaurantId, restaurantId),
          inArray(reservations.status, ["SCHEDULED", "CONFIRMED"]),
          lt(reservations.startsAt, endsAt),
          gt(reservations.endsAt, startsAt),
        ),
      );

    return result.map((row: { tableId: string }) => row.tableId);
  }

  async findByCustomerId(customerId: string): Promise<Reservation[]> {
    return await this.client
      .select()
      .from(reservations)
      .where(eq(reservations.customerId, customerId))
      .orderBy(asc(reservations.startsAt), asc(reservations.id));
  }

  async findByCustomerIdAndRestaurantId(
    customerId: string,
    restaurantId: string,
  ): Promise<Reservation[]> {
    return await this.client
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.customerId, customerId),
          eq(reservations.restaurantId, restaurantId),
        ),
      )
      .orderBy(asc(reservations.startsAt), asc(reservations.id));
  }
}
