import { CapacityExceededError } from "../errors/capacity-exceeded-error.js";
import { InvalidTimeRangeError } from "../errors/invalid-time-range-error.js";
import { ReservationConflictError } from "../errors/reservation-conflict-error.js";
import { ResolveCustomerUseCase } from "../../customers/use-cases/resolve-customer.use-case.js";
import { ReservationTransactionManager } from "../repositories/reservation-transaction-manager.js";
import { TableInactiveError } from "../errors/table-inactive-error.js";
import { TableNotFoundError } from "../errors/table-not-found-error.js";
import { TableRestaurantMismatchError } from "../errors/table-restaurant-mismatch-error.js";

interface CreateReservationRequest {
  restaurantId: string;
  tableId: string;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  people: number;
  startsAt: Date;
  endsAt: Date;
  observation?: string | null;
}

export class CreateReservationUseCase {
  constructor(
    private readonly transactionManager: ReservationTransactionManager,
  ) {}

  async execute(request: CreateReservationRequest) {
    if (request.startsAt >= request.endsAt) {
      throw new InvalidTimeRangeError();
    }

    return await this.transactionManager.execute(async (repos) => {
      const table = await repos.tables.findByIdForUpdate(request.tableId);
      if (!table) throw new TableNotFoundError();

      if (!table.active) throw new TableInactiveError();

      if (table.restaurantId !== request.restaurantId)
        throw new TableRestaurantMismatchError();

      if (request.people > table.capacity) throw new CapacityExceededError();

      const customer = await new ResolveCustomerUseCase(
        repos.customers,
      ).execute(request.customer);

      const conflict = await repos.reservations.findConflictingReservation(
        request.tableId,
        request.startsAt,
        request.endsAt,
      );

      if (conflict) throw new ReservationConflictError();

      const reservation = await repos.reservations.create({
        restaurantId: request.restaurantId,
        tableId: request.tableId,
        customerId: customer.id,
        status: "SCHEDULED",
        people: request.people,
        startsAt: request.startsAt,
        endsAt: request.endsAt,
        observation: request.observation,
      });

      await repos.reservationHistory.create({
        reservationId: reservation.id,
        action: "CREATED",
        previousStatus: null,
        newStatus: "SCHEDULED",
        observation: "Reserva criada",
      });

      return reservation;
    });
  }
}
