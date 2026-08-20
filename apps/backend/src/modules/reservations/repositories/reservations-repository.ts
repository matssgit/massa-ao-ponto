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
  findById(id: string): Promise<Reservation | null>;
  updateStatus(id: string, status: Reservation["status"]): Promise<Reservation>;
  findManyByRestaurantId(
    filters: FindManyReservationsFilters,
  ): Promise<Reservation[]>;
  findConflictingTableIds(
    restaurantId: string,
    startsAt: Date,
    endsAt: Date,
  ): Promise<string[]>;
  findByCustomerId(customerId: string): Promise<Reservation[]>;
}

export interface FindManyReservationsFilters {
  restaurantId: string;
  status?: "SCHEDULED" | "CONFIRMED" | "CANCELLED" | "FINISHED" | "NO_SHOW";
  startsAt?: Date;
  endsAt?: Date;
}
