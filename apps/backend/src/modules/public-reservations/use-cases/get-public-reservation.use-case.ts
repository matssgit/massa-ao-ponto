import { PublicReservationNotFoundError } from "../../reservations/errors/public-reservation-not-found-error.js";
import { hashPublicReservationToken } from "../../reservations/public-reservation-tokens.js";
import type { ReservationsRepository } from "../../reservations/repositories/reservations-repository.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import type { TablesRepository } from "../../tables/repositories/tables-repository.js";
import { publicReservationView } from "../public-view.js";

export class GetPublicReservationUseCase {
  constructor(
    private readonly reservations: ReservationsRepository,
    private readonly restaurants: RestaurantsRepository,
    private readonly tables: TablesRepository,
  ) {}

  async execute(token: string) {
    const reservation = await this.reservations.findByPublicAccessTokenHash(
      hashPublicReservationToken(token),
    );
    if (!reservation) throw new PublicReservationNotFoundError();
    const [restaurant, table] = await Promise.all([
      this.restaurants.findById(reservation.restaurantId),
      this.tables.findByIdAndRestaurantId(reservation.tableId, reservation.restaurantId),
    ]);
    if (!restaurant || !table) throw new PublicReservationNotFoundError();
    return publicReservationView(reservation, restaurant, table);
  }
}