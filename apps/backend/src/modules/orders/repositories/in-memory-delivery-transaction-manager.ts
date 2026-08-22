import { DeliveriesRepository } from "./deliveries-repository.js";
import { DeliveryHistoryRepository } from "./delivery-history-repository.js";
import { DeliveryTransactionManager } from "./delivery-transaction-manager.js";
import { OrderHistoryRepository } from "./order-history-repository.js";
import { OrdersRepository } from "./orders-repository.js";

export class InMemoryDeliveryTransactionManager implements DeliveryTransactionManager {
  constructor(
    private readonly deliveriesRepository: DeliveriesRepository,
    private readonly deliveryHistoryRepository: DeliveryHistoryRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly orderHistoryRepository: OrderHistoryRepository,
  ) {}

  async transaction<T>(
    callback: (repositories: {
      deliveriesRepository: DeliveriesRepository;
      deliveryHistoryRepository: DeliveryHistoryRepository;
      ordersRepository: OrdersRepository;
      orderHistoryRepository: OrderHistoryRepository;
    }) => Promise<T>,
  ): Promise<T> {
    return callback({
      deliveriesRepository: this.deliveriesRepository,
      deliveryHistoryRepository: this.deliveryHistoryRepository,
      ordersRepository: this.ordersRepository,
      orderHistoryRepository: this.orderHistoryRepository,
    });
  }
}
