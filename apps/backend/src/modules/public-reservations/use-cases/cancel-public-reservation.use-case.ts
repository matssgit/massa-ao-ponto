import { PublicReservationNotFoundError } from "../../reservations/errors/public-reservation-not-found-error.js";
import { hashPublicReservationToken } from "../../reservations/public-reservation-tokens.js";
import type { ReservationTransactionManager } from "../../reservations/repositories/reservation-transaction-manager.js";
import type { ReservationsRepository } from "../../reservations/repositories/reservations-repository.js";
import { CancelReservationUseCase } from "../../reservations/use-cases/cancel-reservation.use-case.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import type { TablesRepository } from "../../tables/repositories/tables-repository.js";
import { publicReservationView } from "../public-view.js";

export class CancelPublicReservationUseCase {
  constructor(
    private readonly reservations: ReservationsRepository,
    private readonly restaurants: RestaurantsRepository,
    private readonly tables: TablesRepository,
    private readonly transactions: ReservationTransactionManager,
  ) {}

  async execute(token: string, now: Date) {
    const reservation = await this.reservations.findByPublicAccessTokenHash(
      hashPublicReservationToken(token),
    );
    if (!reservation) throw new PublicReservationNotFoundError();
    const cancelled = await new CancelReservationUseCase(this.transactions).execute({
      restaurantId: reservation.restaurantId,
      reservationId: reservation.id,
      now,
    });
    const [restaurant, table] = await Promise.all([
      this.restaurants.findById(cancelled.restaurantId),
      this.tables.findByIdAndRestaurantId(cancelled.tableId, cancelled.restaurantId),
    ]);
    if (!restaurant || !table) throw new PublicReservationNotFoundError();
    return publicReservationView(cancelled, restaurant, table);
  }
}