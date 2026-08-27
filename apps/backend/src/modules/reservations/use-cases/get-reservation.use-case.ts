import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { ReservationsRepository } from "../repositories/reservations-repository.js";

interface GetReservationRequest {
  restaurantId: string;
  reservationId: string;
}

export class GetReservationUseCase {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
  ) {}

  async execute({ restaurantId, reservationId }: GetReservationRequest) {
    const reservation =
      await this.reservationsRepository.findByIdAndRestaurantId(
        reservationId,
        restaurantId,
      );

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    return reservation;
  }
}
