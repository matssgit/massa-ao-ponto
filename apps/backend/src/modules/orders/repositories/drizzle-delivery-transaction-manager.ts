import { DeliveriesRepository } from "./deliveries-repository.js";
import { DeliveryHistoryRepository } from "./delivery-history-repository.js";
import { DeliveryTransactionManager } from "./delivery-transaction-manager.js";
import { DrizzleDeliveriesRepository } from "./drizzle-deliveries-repository.js";
import { DrizzleDeliveryHistoryRepository } from "./drizzle-delivery-history-repository.js";
import { DrizzleOrderHistoryRepository } from "./drizzle-order-history-repository.js";
import { DrizzleOrdersRepository } from "./drizzle-orders-repository.js";
import { OrderHistoryRepository } from "./order-history-repository.js";
import { OrdersRepository } from "./orders-repository.js";
import { db } from "../../../db/index.js";

export class DrizzleDeliveryTransactionManager implements DeliveryTransactionManager {
  constructor(private readonly client: any = db) {}

  async transaction<T>(
    callback: (repositories: {
      deliveriesRepository: DeliveriesRepository;
      deliveryHistoryRepository: DeliveryHistoryRepository;
      ordersRepository: OrdersRepository;
      orderHistoryRepository: OrderHistoryRepository;
    }) => Promise<T>,
  ): Promise<T> {
    return await this.client.transaction(async (tx: any) => {
      const deliveriesRepository = new DrizzleDeliveriesRepository(tx);
      const deliveryHistoryRepository = new DrizzleDeliveryHistoryRepository(
        tx,
      );
      const ordersRepository = new DrizzleOrdersRepository(tx);
      const orderHistoryRepository = new DrizzleOrderHistoryRepository(tx);

      return await callback({
        deliveriesRepository,
        deliveryHistoryRepository,
        ordersRepository,
        orderHistoryRepository,
      });
    });
  }
}
