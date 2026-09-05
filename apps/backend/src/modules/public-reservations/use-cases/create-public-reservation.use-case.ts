import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import type { ReservationTransactionManager } from "../../reservations/repositories/reservation-transaction-manager.js";
import { createPublicReservationToken, hashPublicReservationToken } from "../../reservations/public-reservation-tokens.js";
import { CreateReservationUseCase } from "../../reservations/use-cases/create-reservation.use-case.js";
import type { TablesRepository } from "../../tables/repositories/tables-repository.js";
import { PublicReservationNotFoundError } from "../../reservations/errors/public-reservation-not-found-error.js";
import { publicReservationView } from "../public-view.js";

interface Input {
  slug: string;
  tableId: string;
  customer: { name: string; phone: string; email?: string | null };
  partySize: number;
  startsAt: Date;
  endsAt: Date;
  notes?: string | null;
}

export class CreatePublicReservationUseCase {
  constructor(
    private readonly restaurants: RestaurantsRepository,
    private readonly tables: TablesRepository,
    private readonly transactions: ReservationTransactionManager,
  ) {}

  async execute(input: Input) {
    const restaurant = await this.restaurants.findPublishedBySlug(input.slug);
    if (!restaurant) throw new RestaurantNotFoundError();
    const accessToken = createPublicReservationToken();
    const reservation = await new CreateReservationUseCase(this.transactions).execute({
      restaurantId: restaurant.id,
      tableId: input.tableId,
      customer: input.customer,
      people: input.partySize,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      observation: input.notes,
      publicAccessTokenHash: hashPublicReservationToken(accessToken),
    });
    const table = await this.tables.findByIdAndRestaurantId(input.tableId, restaurant.id);
    if (!table) throw new PublicReservationNotFoundError();
    return { accessToken, ...publicReservationView(reservation, restaurant, table) };
  }
}