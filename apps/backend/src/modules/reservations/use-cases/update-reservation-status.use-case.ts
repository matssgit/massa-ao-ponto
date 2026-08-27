import { InvalidReservationStatusTransitionError } from "../errors/invalid-reservation-status-transition-error.js";
import { Reservation } from "../repositories/reservations-repository.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { ReservationTransactionManager } from "../repositories/reservation-transaction-manager.js";

interface UpdateReservationStatusRequest {
  restaurantId: string;
  reservationId: string;
  newStatus: Reservation["status"];
  observation?: string | null;
}

export class UpdateReservationStatusUseCase {
  private readonly allowedTransitions: Record<
    Reservation["status"],
    Reservation["status"][]
  > = {
    SCHEDULED: ["CONFIRMED", "CANCELLED"],
    CONFIRMED: ["FINISHED", "NO_SHOW", "CANCELLED"],
    CANCELLED: [],
    FINISHED: [],
    NO_SHOW: [],
  };

  constructor(
    private readonly transactionManager: ReservationTransactionManager,
  ) {}

  async execute(request: UpdateReservationStatusRequest) {
    return await this.transactionManager.execute(async (repos) => {
      const reservation = await repos.reservations.findByIdAndRestaurantIdForUpdate(
        request.reservationId,
        request.restaurantId,
      );

      if (!reservation) {
        throw new ReservationNotFoundError();
      }

      const isValidTransition = this.allowedTransitions[
        reservation.status
      ].includes(request.newStatus);

      if (!isValidTransition || reservation.status === request.newStatus) {
        throw new InvalidReservationStatusTransitionError(
          reservation.status,
          request.newStatus,
        );
      }

      const previousStatus = reservation.status;

      const updatedReservation = await repos.reservations.updateStatus(
        request.reservationId,
        request.newStatus,
      );

      await repos.reservationHistory.create({
        reservationId: updatedReservation.id,
        action: "STATUS_CHANGED",
        previousStatus,
        newStatus: request.newStatus,
        observation: request.observation,
      });

      return updatedReservation;
    });
  }
}
