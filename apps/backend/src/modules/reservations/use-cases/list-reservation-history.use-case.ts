import { ReservationHistoryRepository } from "../repositories/reservation-history-repository.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { ReservationsRepository } from "../repositories/reservations-repository.js";

interface ListReservationHistoryRequest {
  restaurantId: string;
  reservationId: string;
}

export class ListReservationHistoryUseCase {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly reservationHistoryRepository: ReservationHistoryRepository,
  ) {}

  async execute({ restaurantId, reservationId }: ListReservationHistoryRequest) {
    const reservation =
      await this.reservationsRepository.findByIdAndRestaurantId(
        reservationId,
        restaurantId,
      );

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    return await this.reservationHistoryRepository.findByReservationId(
      reservationId,
    );
  }
}
