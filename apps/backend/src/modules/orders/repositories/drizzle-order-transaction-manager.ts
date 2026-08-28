import { DrizzleOrderHistoryRepository } from "./drizzle-order-history-repository.js";
import { DrizzleOrderItemsRepository } from "./drizzle-order-items-repository.js";
import { DrizzleOrdersRepository } from "./drizzle-orders-repository.js";
import { DrizzleTablesRepository } from "../../tables/repositories/drizzle-tables-repository.js";
import { DrizzleCustomersRepository } from "../../reservations/repositories/drizzle-customers-repository.js";
import {
  OrderTransactionManager,
  OrderTransactionalRepositories,
} from "./order-transaction-manager.js";
import { db } from "../../../db/index.js";

export class DrizzleOrderTransactionManager implements OrderTransactionManager {
  constructor(private readonly client: any = db) {}

  async transaction<T>(
    callback: (repositories: OrderTransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    return await this.client.transaction(async (tx: any) => {
      const ordersRepository = new DrizzleOrdersRepository(tx);
      const orderItemsRepository = new DrizzleOrderItemsRepository(tx);
      const orderHistoryRepository = new DrizzleOrderHistoryRepository(tx);
      const tablesRepository = new DrizzleTablesRepository(tx);
      const customersRepository = new DrizzleCustomersRepository(tx);

      return await callback({
        ordersRepository,
        orderItemsRepository,
        orderHistoryRepository,
        tablesRepository,
        customersRepository,
      });
    });
  }
}
