import { beforeEach, describe, expect, it } from "vitest";

import { CancelOrderUseCase } from "./cancel-order.use-case.js";
import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrderTransactionManager } from "../repositories/in-memory-order-transaction-manager.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("CancelOrderUseCase", () => {
  let ordersRepository: InMemoryOrdersRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let transactionManager: InMemoryOrderTransactionManager;
  let useCase: CancelOrderUseCase;

  beforeEach(() => {
    ordersRepository = new InMemoryOrdersRepository();
    const orderItemsRepository = new InMemoryOrderItemsRepository();
    orderHistoryRepository = new InMemoryOrderHistoryRepository();
    transactionManager = new InMemoryOrderTransactionManager(
      ordersRepository,
      orderItemsRepository,
      orderHistoryRepository,
    );
    useCase = new CancelOrderUseCase(transactionManager);
  });

  async function createOrder(status: string) {
    return await ordersRepository.create({
      restaurantId: randomUUID(),
      customerId: randomUUID(),
      type: "DELIVERY",
      status,
      paymentStatus: "PENDING",
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      customerName: "A",
      customerPhone: "1",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });
  }

  it("deve cancelar com sucesso um pedido PENDING", async () => {
    const order = await createOrder("PENDING");
    await useCase.execute({ orderId: order.id });

    const updated = await ordersRepository.findById(order.id);
    expect(updated?.status).toBe("CANCELLED");

    expect(orderHistoryRepository.items).toHaveLength(1);
    expect(orderHistoryRepository.items[0].previousStatus).toBe("PENDING");
    expect(orderHistoryRepository.items[0].newStatus).toBe("CANCELLED");
  });

  it("deve cancelar com sucesso um pedido CONFIRMED", async () => {
    const order = await createOrder("CONFIRMED");
    await useCase.execute({ orderId: order.id });

    const updated = await ordersRepository.findById(order.id);
    expect(updated?.status).toBe("CANCELLED");
  });

  it("deve rejeitar cancelamento de pedido PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED ou CANCELLED", async () => {
    const statuses = [
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];

    for (const status of statuses) {
      const order = await createOrder(status);
      await expect(
        useCase.execute({ orderId: order.id }),
      ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

      const unchanged = await ordersRepository.findById(order.id);
      expect(unchanged?.status).toBe(status); // Garante que a transação fez rollback/abortou
    }
  });

  it("deve rejeitar caso o pedido não exista", async () => {
    await expect(
      useCase.execute({ orderId: randomUUID() }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});
