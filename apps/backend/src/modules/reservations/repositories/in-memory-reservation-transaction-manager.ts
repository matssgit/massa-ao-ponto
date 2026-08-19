import {
  ReservationRepositories,
  ReservationTransactionManager,
} from "./reservation-transaction-manager.js";

import { CustomersRepository } from "./customers-repository.js";
import { ReservationHistoryRepository } from "./reservation-history-repository.js";
import { ReservationsRepository } from "./reservations-repository.js";
import { TablesRepository } from "../../tables/repositories/tables-repository.js";

export class InMemoryReservationTransactionManager implements ReservationTransactionManager {
  constructor(
    private tablesRepository: TablesRepository,
    private customersRepository: CustomersRepository,
    private reservationsRepository: ReservationsRepository,
    private reservationHistoryRepository: ReservationHistoryRepository,
  ) {}

  async execute<T>(
    work: (repos: ReservationRepositories) => Promise<T>,
  ): Promise<T> {
    return await work({
      tables: this.tablesRepository,
      customers: this.customersRepository,
      reservations: this.reservationsRepository,
      reservationHistory: this.reservationHistoryRepository,
    });
  }
}
