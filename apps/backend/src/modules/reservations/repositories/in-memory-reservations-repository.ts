import {
  CreateReservationData,
  FindManyReservationsFilters,
  Reservation,
  ReservationsRepository,
} from "./reservations-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryReservationsRepository implements ReservationsRepository {
  public items: Reservation[] = [];
  private readonly tokenHashes = new Map<string, string>();

  private matchesFilters(
    item: Reservation,
    filters: FindManyReservationsFilters,
  ): boolean {
    if (item.restaurantId !== filters.restaurantId) return false;
    if (filters.status && item.status !== filters.status) return false;
    if (filters.endsAt && item.startsAt >= filters.endsAt) return false;
    if (filters.startsAt && item.endsAt <= filters.startsAt) return false;
    return true;
  }

  async create(data: CreateReservationData): Promise<Reservation> {
    const { publicAccessTokenHash, ...fields } = data;
    const reservation: Reservation = {
      id: randomUUID(),
      ...fields,
      observation: data.observation || null,
    };
    this.items.push(reservation);
    if (publicAccessTokenHash) this.tokenHashes.set(reservation.id, publicAccessTokenHash);
    return reservation;
  }

  async findConflictingReservation(
    tableId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Reservation | null> {
    return (
      this.items.find(
        (item) =>
          item.tableId === tableId &&
          ["SCHEDULED", "CONFIRMED"].includes(item.status) &&
          item.startsAt < endsAt &&
          item.endsAt > startsAt,
      ) || null
    );
  }

  async findById(id: string): Promise<Reservation | null> {
    return this.items.find((item) => item.id === id) || null;
  }

  async findByPublicAccessTokenHash(tokenHash: string): Promise<Reservation | null> {
    return this.items.find((item) => this.tokenHashes.get(item.id) === tokenHash) ?? null;
  }

  async findByIdAndRestaurantId(
    reservationId: string,
    restaurantId: string,
  ): Promise<Reservation | null> {
    return (
      this.items.find(
        (item) =>
          item.id === reservationId && item.restaurantId === restaurantId,
      ) || null
    );
  }

  async findByIdAndRestaurantIdForUpdate(
    reservationId: string,
    restaurantId: string,
  ): Promise<Reservation | null> {
    return this.findByIdAndRestaurantId(reservationId, restaurantId);
  }

  async updateStatus(
    id: string,
    status: Reservation["status"],
  ): Promise<Reservation> {
    const reservationIndex = this.items.findIndex((item) => item.id === id);
    this.items[reservationIndex].status = status;
    return this.items[reservationIndex];
  }

  async findManyByRestaurantId(
    filters: FindManyReservationsFilters,
  ): Promise<Reservation[]> {
    const offset = (filters.page - 1) * filters.limit;

    return this.items
      .filter((item) => this.matchesFilters(item, filters))
      .sort((a, b) => {
        const timeComparison = a.startsAt.getTime() - b.startsAt.getTime();
        if (timeComparison !== 0) {
          return timeComparison;
        }
        return a.id.localeCompare(b.id);
      })
      .slice(offset, offset + filters.limit);
  }

  async findConflictingTableIds(
    restaurantId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<string[]> {
    return this.items
      .filter(
        (res) =>
          res.restaurantId === restaurantId &&
          ["SCHEDULED", "CONFIRMED"].includes(res.status) &&
          res.startsAt < endsAt &&
          res.endsAt > startsAt,
      )
      .map((res) => res.tableId);
  }

  async findByCustomerId(customerId: string): Promise<Reservation[]> {
    return this.items
      .filter((item) => item.customerId === customerId)
      .sort((a, b) => {
        const timeComparison = a.startsAt.getTime() - b.startsAt.getTime();
        if (timeComparison !== 0) {
          return timeComparison;
        }
        return a.id.localeCompare(b.id);
      });
  }

  async findByCustomerIdAndRestaurantId(
    customerId: string,
    restaurantId: string,
  ): Promise<Reservation[]> {
    return this.items
      .filter(
        (item) =>
          item.customerId === customerId &&
          item.restaurantId === restaurantId,
      )
      .sort((a, b) => {
        const timeComparison = a.startsAt.getTime() - b.startsAt.getTime();
        if (timeComparison !== 0) {
          return timeComparison;
        }
        return a.id.localeCompare(b.id);
      });
  }

  async countByRestaurantId(
    filters: FindManyReservationsFilters,
  ): Promise<number> {
    return this.items.filter((item) => this.matchesFilters(item, filters))
      .length;
  }
}
