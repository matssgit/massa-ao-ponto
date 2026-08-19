import {
  CreateReservationData,
  FindManyReservationsFilters,
  Reservation,
  ReservationsRepository,
} from "./reservations-repository.js";

import { randomUUID } from "node:crypto";

export class InMemoryReservationsRepository implements ReservationsRepository {
  public items: Reservation[] = [];

  async create(data: CreateReservationData): Promise<Reservation> {
    const reservation: Reservation = {
      id: randomUUID(),
      ...data,
      observation: data.observation || null,
    };
    this.items.push(reservation);
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
    return this.items
      .filter((item) => {
        if (item.restaurantId !== filters.restaurantId) {
          return false;
        }

        if (filters.status && item.status !== filters.status) {
          return false;
        }

        if (filters.startsAt && item.startsAt < filters.startsAt) {
          return false;
        }

        if (filters.endsAt && item.endsAt > filters.endsAt) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeComparison = a.startsAt.getTime() - b.startsAt.getTime();
        if (timeComparison !== 0) {
          return timeComparison;
        }
        return a.id.localeCompare(b.id);
      });
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
}
