import {
  OrderTransactionManager,
  OrderTransactionalRepositories,
} from "./order-transaction-manager.js";

import { DrizzleOrderHistoryRepository } from "./drizzle-order-history-repository.js";
import { DrizzleOrderItemsRepository } from "./drizzle-order-items-repository.js";
import { DrizzleOrdersRepository } from "./drizzle-orders-repository.js";
import { db } from "../../../db/index.js";

export class DrizzleOrderTransactionManager implements OrderTransactionManager {
  async transaction<T>(
    callback: (repositories: OrderTransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    return await db.transaction(async (tx) => {
      return await callback({
        ordersRepository: new DrizzleOrdersRepository(tx),
        orderItemsRepository: new DrizzleOrderItemsRepository(tx),
        orderHistoryRepository: new DrizzleOrderHistoryRepository(tx),
      });
    });
  }
}
