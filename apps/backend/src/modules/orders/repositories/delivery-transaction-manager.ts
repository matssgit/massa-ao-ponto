import { DeliveriesRepository } from "./deliveries-repository.js";
import { DeliveryHistoryRepository } from "./delivery-history-repository.js";
import { OrderHistoryRepository } from "./order-history-repository.js";
import { OrdersRepository } from "./orders-repository.js";

export interface DeliveryTransactionManager {
  transaction<T>(
    callback: (repositories: {
      deliveriesRepository: DeliveriesRepository;
      deliveryHistoryRepository: DeliveryHistoryRepository;
      ordersRepository: OrdersRepository;
      orderHistoryRepository: OrderHistoryRepository;
    }) => Promise<T>,
  ): Promise<T>;
}
