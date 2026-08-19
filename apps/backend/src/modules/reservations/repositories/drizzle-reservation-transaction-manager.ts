import {
  ReservationRepositories,
  ReservationTransactionManager,
} from "./reservation-transaction-manager.js";

import { DrizzleCustomersRepository } from "./drizzle-customers-repository.js";
import { DrizzleReservationHistoryRepository } from "./drizzle-reservation-history-repository.js";
import { DrizzleReservationsRepository } from "./drizzle-reservations-repository.js";
import { DrizzleTablesRepository } from "../../tables/repositories/drizzle-tables-repository.js";
import { db } from "../../../db/index.js";

export class DrizzleReservationTransactionManager implements ReservationTransactionManager {
  async execute<T>(
    work: (repos: ReservationRepositories) => Promise<T>,
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      const repos: ReservationRepositories = {
        tables: new DrizzleTablesRepository(tx),
        customers: new DrizzleCustomersRepository(tx),
        reservations: new DrizzleReservationsRepository(tx),
        reservationHistory: new DrizzleReservationHistoryRepository(tx),
      };

      return await work(repos);
    });
  }
}
