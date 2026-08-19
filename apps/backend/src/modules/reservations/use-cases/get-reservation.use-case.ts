import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { ReservationsRepository } from "../repositories/reservations-repository.js";

interface GetReservationRequest {
  reservationId: string;
}

export class GetReservationUseCase {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
  ) {}

  async execute({ reservationId }: GetReservationRequest) {
    const reservation =
      await this.reservationsRepository.findById(reservationId);

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    return reservation;
  }
}
