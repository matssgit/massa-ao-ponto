export interface Reservation {
  id: string;
  restaurantId: string;
  tableId: string;
  customerId: string;
  status: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "FINISHED" | "NO_SHOW";
  people: number;
  startsAt: Date;
  endsAt: Date;
  observation: string | null;
}

export interface CreateReservationData {
  restaurantId: string;
  tableId: string;
  customerId: string;
  status: "SCHEDULED";
  people: number;
  startsAt: Date;
  endsAt: Date;
  observation?: string | null;
}

export interface ReservationsRepository {
  create(data: CreateReservationData): Promise<Reservation>;
  findConflictingReservation(
    tableId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Reservation | null>;
}
