import { OrderHistoryRepository } from "./order-history-repository.js";
import { OrderItemsRepository } from "./order-items-repository.js";
import { OrdersRepository } from "./orders-repository.js";
import { TablesRepository } from "../../tables/repositories/tables-repository.js";
import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";

export interface OrderTransactionalRepositories {
  ordersRepository: OrdersRepository;
  orderItemsRepository: OrderItemsRepository;
  orderHistoryRepository: OrderHistoryRepository;
  tablesRepository: TablesRepository;
  customersRepository: CustomersRepository;
}

export interface OrderTransactionManager {
  transaction<T>(
    callback: (repositories: OrderTransactionalRepositories) => Promise<T>,
  ): Promise<T>;
}
