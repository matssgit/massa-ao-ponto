import { OrderHistoryRepository } from "./order-history-repository.js";
import { OrderItemsRepository } from "./order-items-repository.js";
import { OrdersRepository } from "./orders-repository.js";

export interface OrderTransactionalRepositories {
  ordersRepository: OrdersRepository;
  orderItemsRepository: OrderItemsRepository;
  orderHistoryRepository: OrderHistoryRepository;
}

export interface OrderTransactionManager {
  transaction<T>(
    callback: (repositories: OrderTransactionalRepositories) => Promise<T>,
  ): Promise<T>;
}
