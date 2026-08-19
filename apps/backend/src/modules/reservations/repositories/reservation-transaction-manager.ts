import { CustomersRepository } from "./customers-repository.js";
import { ReservationHistoryRepository } from "./reservation-history-repository.js";
import { ReservationsRepository } from "./reservations-repository.js";
import { TablesRepository } from "../../tables/repositories/tables-repository.js";

export interface ReservationRepositories {
  tables: TablesRepository;
  customers: CustomersRepository;
  reservations: ReservationsRepository;
  reservationHistory: ReservationHistoryRepository;
}

export interface ReservationTransactionManager {
  execute<T>(work: (repos: ReservationRepositories) => Promise<T>): Promise<T>;
}
