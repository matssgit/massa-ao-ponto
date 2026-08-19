import { ReservationHistoryRepository } from "../repositories/reservation-history-repository.js";
import { ReservationNotFoundError } from "../errors/reservation-not-found-error.js";
import { ReservationsRepository } from "../repositories/reservations-repository.js";

interface ListReservationHistoryRequest {
  reservationId: string;
}

export class ListReservationHistoryUseCase {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly reservationHistoryRepository: ReservationHistoryRepository,
  ) {}

  async execute({ reservationId }: ListReservationHistoryRequest) {
    const reservation =
      await this.reservationsRepository.findById(reservationId);

    if (!reservation) {
      throw new ReservationNotFoundError();
    }

    return await this.reservationHistoryRepository.findByReservationId(
      reservationId,
    );
  }
}
