import {
  CreateReservationData,
  FindManyReservationsFilters,
  Reservation,
  ReservationsRepository,
} from "./reservations-repository.js";
import { and, asc, eq, gt, inArray, lt, sql } from "drizzle-orm";

import { db } from "../../../db/index.js";
import { reservations } from "../../../db/schema/index.js";

function buildListConditions(filters: FindManyReservationsFilters) {
  const conditions = [eq(reservations.restaurantId, filters.restaurantId)];

  if (filters.status) {
    conditions.push(eq(reservations.status, filters.status));
  }

  if (filters.endsAt) {
    conditions.push(lt(reservations.startsAt, filters.endsAt));
  }

  if (filters.startsAt) {
    conditions.push(gt(reservations.endsAt, filters.startsAt));
  }

  return conditions;
}

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
    const result = await this.client
      .select()
      .from(reservations)
      .where(and(...buildListConditions(filters)))
      .orderBy(asc(reservations.startsAt), asc(reservations.id))
      .limit(filters.limit)
      .offset((filters.page - 1) * filters.limit);

    return result;
  }

  async countByRestaurantId(
    filters: FindManyReservationsFilters,
  ): Promise<number> {
    const [result] = await this.client
      .select({ total: sql<number>`cast(count(*) as integer)` })
      .from(reservations)
      .where(and(...buildListConditions(filters)));

    return result.total;
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
