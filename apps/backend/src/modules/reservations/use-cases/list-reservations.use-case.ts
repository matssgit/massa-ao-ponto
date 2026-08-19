import { InvalidTimeRangeFilterError } from "../errors/invalid-time-range-filter-error.js";
import { ReservationsRepository } from "../repositories/reservations-repository.js";
import { reservationStatusEnum } from "../../../db/schema/reservation-status.js";

interface ListReservationsRequest {
  restaurantId: string;
  status?: (typeof reservationStatusEnum)[number];
  startsAt?: Date;
  endsAt?: Date;
}

export class ListReservationsUseCase {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
  ) {}

  async execute(request: ListReservationsRequest) {
    if (
      request.startsAt &&
      request.endsAt &&
      request.startsAt > request.endsAt
    ) {
      throw new InvalidTimeRangeFilterError();
    }

    return await this.reservationsRepository.findManyByRestaurantId({
      restaurantId: request.restaurantId,
      status: request.status,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
    });
  }
}
