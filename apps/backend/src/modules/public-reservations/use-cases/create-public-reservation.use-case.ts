import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import type { ReservationTransactionManager } from "../../reservations/repositories/reservation-transaction-manager.js";
import { createPublicReservationToken, hashPublicReservationToken } from "../../reservations/public-reservation-tokens.js";
import { CreateReservationUseCase } from "../../reservations/use-cases/create-reservation.use-case.js";
import type { TablesRepository } from "../../tables/repositories/tables-repository.js";
import { PublicReservationNotFoundError } from "../../reservations/errors/public-reservation-not-found-error.js";
import { publicReservationView } from "../public-view.js";
import type { OperatingHoursRepository } from "../../restaurants/repositories/operating-hours-repository.js";
import { isReservationWithinOperatingHours } from "../../restaurants/operating-hours.js";
import { RestaurantClosedError } from "../../restaurants/errors/restaurant-closed-error.js";

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
    private readonly operatingHours: OperatingHoursRepository,
  ) {}

  async execute(input: Input) {
    const restaurant = await this.restaurants.findPublishedBySlug(input.slug);
    if (!restaurant) throw new RestaurantNotFoundError();
    const hours = await this.operatingHours.findByRestaurantId(restaurant.id);
    if (!isReservationWithinOperatingHours(hours, restaurant.timezone, input.startsAt, input.endsAt, restaurant.operationalOverride)) throw new RestaurantClosedError();
    const table = await this.tables.findByIdAndRestaurantId(input.tableId, restaurant.id);
    if (!table) throw new PublicReservationNotFoundError();
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
    return { accessToken, ...publicReservationView(reservation, restaurant, table, hours) };
  }
}
