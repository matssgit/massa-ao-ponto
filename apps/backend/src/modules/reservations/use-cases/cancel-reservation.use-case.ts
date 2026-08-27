import { InvalidReservationStatusTransitionError } from "../errors/invalid-reservation-status-transition-error.js";
import { ReservationCancellationWindowExpiredError } from "../errors/reservation-cancellation-window-expired-error.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { ReservationTransactionManager } from "../repositories/reservation-transaction-manager.js";

interface CancelReservationRequest {
  restaurantId: string;
  reservationId: string;
  now: Date;
}

export class CancelReservationUseCase {
  constructor(
    private readonly transactionManager: ReservationTransactionManager,
  ) {}

  async execute(request: CancelReservationRequest) {
    return await this.transactionManager.execute(async (repos) => {
      const reservation = await repos.reservations.findByIdAndRestaurantIdForUpdate(
        request.reservationId,
        request.restaurantId,
      );

      if (!reservation) {
        throw new ReservationNotFoundError();
      }

      if (
        reservation.status !== "SCHEDULED" &&
        reservation.status !== "CONFIRMED"
      ) {
        throw new InvalidReservationStatusTransitionError(
          reservation.status,
          "CANCELLED",
        );
      }

      const diffInMs = reservation.startsAt.getTime() - request.now.getTime();
      const TWO_HOURS_IN_MS = 2 * 60 * 60 * 1000;

      if (diffInMs <= TWO_HOURS_IN_MS) {
        throw new ReservationCancellationWindowExpiredError();
      }

      const previousStatus = reservation.status;

      const updatedReservation = await repos.reservations.updateStatus(
        request.reservationId,
        "CANCELLED",
      );

      await repos.reservationHistory.create({
        reservationId: updatedReservation.id,
        action: "STATUS_CHANGED",
        previousStatus,
        newStatus: "CANCELLED",
        observation: "Cancelamento efetuado via regra de negócio",
      });

      return updatedReservation;
    });
  }
}
