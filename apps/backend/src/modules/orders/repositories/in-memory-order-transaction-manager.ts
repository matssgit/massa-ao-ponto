import {
  OrderTransactionManager,
  OrderTransactionalRepositories,
} from "./order-transaction-manager.js";

import { InMemoryOrderHistoryRepository } from "./in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "./in-memory-order-items-repository.js";
import { InMemoryOrdersRepository } from "./in-memory-orders-repository.js";

export class InMemoryOrderTransactionManager implements OrderTransactionManager {
  constructor(
    private readonly ordersRepository: InMemoryOrdersRepository,
    private readonly orderItemsRepository: InMemoryOrderItemsRepository,
    private readonly orderHistoryRepository: InMemoryOrderHistoryRepository,
  ) {}

  async transaction<T>(
    callback: (repositories: OrderTransactionalRepositories) => Promise<T>,
  ): Promise<T> {
    return await callback({
      ordersRepository: this.ordersRepository,
      orderItemsRepository: this.orderItemsRepository,
      orderHistoryRepository: this.orderHistoryRepository,
    });
  }
}
