import {
  CreateReservationData,
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
}
