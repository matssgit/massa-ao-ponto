import {
  OrderTransactionManager,
  OrderTransactionalRepositories,
} from "./order-transaction-manager.js";

import { InMemoryOrderHistoryRepository } from "./in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "./in-memory-order-items-repository.js";
import { InMemoryOrdersRepository } from "./in-memory-orders-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";

export class InMemoryOrderTransactionManager implements OrderTransactionManager {
  constructor(
    private ordersRepository: InMemoryOrdersRepository,
    private orderItemsRepository: InMemoryOrderItemsRepository,
    private orderHistoryRepository: InMemoryOrderHistoryRepository,
    private tablesRepository: InMemoryTablesRepository,
  ) {}

  async transaction<T>(callback: any): Promise<T> {
    return callback({
      ordersRepository: this.ordersRepository,
      orderItemsRepository: this.orderItemsRepository,
      orderHistoryRepository: this.orderHistoryRepository,
      tablesRepository: this.tablesRepository,
    });
  }
}
