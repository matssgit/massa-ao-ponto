import { InvalidTimeRangeFilterError } from "../errors/invalid-time-range-filter-error.js";
import {
  Customer,
  CustomersRepository,
} from "../repositories/customers-repository.js";
import {
  Reservation,
  ReservationsRepository,
} from "../repositories/reservations-repository.js";
import {
  Table,
  TablesRepository,
} from "../../tables/repositories/tables-repository.js";
import { reservationStatusEnum } from "../../../db/schema/reservation-status.js";

interface ListReservationsRequest {
  restaurantId: string;
  status?: (typeof reservationStatusEnum)[number];
  startsAt?: Date;
  endsAt?: Date;
  page: number;
  limit: number;
}

export class ListReservationsUseCase {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly customersRepository: CustomersRepository,
    private readonly tablesRepository: TablesRepository,
  ) {}

  async execute(request: ListReservationsRequest) {
    if (
      request.startsAt &&
      request.endsAt &&
      request.startsAt > request.endsAt
    ) {
      throw new InvalidTimeRangeFilterError();
    }

    const filters = {
      restaurantId: request.restaurantId,
      status: request.status,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      page: request.page,
      limit: request.limit,
    };
    const [reservations, total] = await Promise.all([
      this.reservationsRepository.findManyByRestaurantId(filters),
      this.reservationsRepository.countByRestaurantId(filters),
    ]);

    const data: Array<{
      reservation: Reservation;
      customer: Customer;
      table: Table;
    }> = [];

    if (reservations.length > 0) {
      const customerIds = [
        ...new Set(reservations.map(({ customerId }) => customerId)),
      ];
      const tableIds = [
        ...new Set(reservations.map(({ tableId }) => tableId)),
      ];
      const [customers, tables] = await Promise.all([
        this.customersRepository.findManyByIds(customerIds),
        this.tablesRepository.findManyByIdsAndRestaurantId(
          tableIds,
          request.restaurantId,
        ),
      ]);
      const customersById = new Map(
        customers.map((customer) => [customer.id, customer]),
      );
      const tablesById = new Map(
        tables.map((table) => [table.id, table]),
      );

      for (const reservation of reservations) {
        const customer = customersById.get(reservation.customerId);
        const table = tablesById.get(reservation.tableId);

        if (!customer || !table) {
          throw new Error("Reservation relationship could not be hydrated.");
        }

        data.push({ reservation, customer, table });
      }
    }

    const totalPages = total === 0 ? 0 : Math.ceil(total / request.limit);

    return {
      data,
      meta: {
        page: request.page,
        limit: request.limit,
        total,
        totalPages,
        hasNext: request.page < totalPages,
        hasPrevious: request.page > 1,
      },
    };
  }
}
