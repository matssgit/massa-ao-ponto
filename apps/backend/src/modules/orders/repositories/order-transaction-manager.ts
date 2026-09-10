import { OrderHistoryRepository } from "./order-history-repository.js";
import { OrderItemsRepository } from "./order-items-repository.js";
import { OrdersRepository } from "./orders-repository.js";
import { TablesRepository } from "../../tables/repositories/tables-repository.js";
import { CustomersRepository } from "../../reservations/repositories/customers-repository.js";
import { DeliveriesRepository } from "./deliveries-repository.js";
import { DeliveryHistoryRepository } from "./delivery-history-repository.js";

export interface OrderTransactionalRepositories {
  ordersRepository: OrdersRepository;
  orderItemsRepository: OrderItemsRepository;
  orderHistoryRepository: OrderHistoryRepository;
  tablesRepository: TablesRepository;
  customersRepository: CustomersRepository;
  deliveriesRepository: DeliveriesRepository;
  deliveryHistoryRepository: DeliveryHistoryRepository;
}

export interface OrderTransactionManager {
  transaction<T>(
    callback: (repositories: OrderTransactionalRepositories) => Promise<T>,
  ): Promise<T>;
}
