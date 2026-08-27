import { beforeEach, describe, expect, it, vi } from "vitest";

import { CancelOrderUseCase } from "./cancel-order.use-case.js";
import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrderTransactionManager } from "../repositories/in-memory-order-transaction-manager.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { PaidOrderCannotBeCancelledError } from "../errors/paid-order-cannot-be-cancelled-error.js";
import {
  OrderPaymentStatus,
  OrderStatus,
} from "../repositories/orders-repository.js";
import { randomUUID } from "node:crypto";

describe("CancelOrderUseCase", () => {
  let ordersRepository: InMemoryOrdersRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let transactionManager: InMemoryOrderTransactionManager;
  let useCase: CancelOrderUseCase;

  beforeEach(() => {
    const tablesRepository = new InMemoryTablesRepository();
    ordersRepository = new InMemoryOrdersRepository();
    const orderItemsRepository = new InMemoryOrderItemsRepository();
    orderHistoryRepository = new InMemoryOrderHistoryRepository();
    transactionManager = new InMemoryOrderTransactionManager(
      ordersRepository,
      orderItemsRepository,
      orderHistoryRepository,
      tablesRepository,
    );
    useCase = new CancelOrderUseCase(transactionManager);
  });

  async function createOrder(
    status: OrderStatus,
    paymentStatus: OrderPaymentStatus = "PENDING",
  ) {
    return await ordersRepository.create({
      restaurantId: randomUUID(),
      customerId: randomUUID(),
      type: "DELIVERY",
      status,
      paymentStatus,
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
    const findForUpdate = vi.spyOn(
      ordersRepository,
      "findByIdAndRestaurantIdForUpdate",
    );
    await useCase.execute({
      restaurantId: order.restaurantId,
      orderId: order.id,
    });

    const updated = await ordersRepository.findById(order.id);
    expect(updated?.status).toBe("CANCELLED");

    expect(orderHistoryRepository.items).toHaveLength(1);
    expect(orderHistoryRepository.items[0].previousStatus).toBe("PENDING");
    expect(orderHistoryRepository.items[0].newStatus).toBe("CANCELLED");
    expect(findForUpdate).toHaveBeenCalledWith(order.id, order.restaurantId);
  });

  it("deve cancelar com sucesso um pedido CONFIRMED", async () => {
    const order = await createOrder("CONFIRMED");
    await useCase.execute({
      restaurantId: order.restaurantId,
      orderId: order.id,
    });

    const updated = await ordersRepository.findById(order.id);
    expect(updated?.status).toBe("CANCELLED");
  });

  it.each(["PENDING", "CONFIRMED"] as const)(
    "deve rejeitar cancelamento de pedido %s pago sem alterar pedido ou histórico",
    async (status) => {
      const order = await createOrder(status, "PAID");
      const originalUpdatedAt = order.updatedAt;

      await expect(
        useCase.execute({
          restaurantId: order.restaurantId,
          orderId: order.id,
        }),
      ).rejects.toBeInstanceOf(PaidOrderCannotBeCancelledError);

      const unchanged = await ordersRepository.findById(order.id);
      expect(unchanged?.status).toBe(status);
      expect(unchanged?.paymentStatus).toBe("PAID");
      expect(unchanged?.updatedAt).toEqual(originalUpdatedAt);
      expect(orderHistoryRepository.items).toHaveLength(0);
    },
  );

  it("deve preservar o erro operacional para pedido não cancelável e pago", async () => {
    const order = await createOrder("PREPARING", "PAID");

    await expect(
      useCase.execute({
        restaurantId: order.restaurantId,
        orderId: order.id,
      }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

    const unchanged = await ordersRepository.findById(order.id);
    expect(unchanged?.status).toBe("PREPARING");
    expect(unchanged?.paymentStatus).toBe("PAID");
    expect(orderHistoryRepository.items).toHaveLength(0);
  });

  it("deve rejeitar cancelamento de pedido PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED ou CANCELLED", async () => {
    const statuses: OrderStatus[] = [
      "PREPARING",
      "READY",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
    ];

    for (const status of statuses) {
      const order = await createOrder(status);
      await expect(
        useCase.execute({
          restaurantId: order.restaurantId,
          orderId: order.id,
        }),
      ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

      const unchanged = await ordersRepository.findById(order.id);
      expect(unchanged?.status).toBe(status);
    }
  });

  it("deve rejeitar caso o pedido não exista", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it("deve tratar pedido de outro restaurante como não encontrado sem cancelar ou gravar histórico", async () => {
    const order = await createOrder("PENDING");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: order.id,
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);

    expect(order.status).toBe("PENDING");
    expect(orderHistoryRepository.items).toHaveLength(0);
  });
});
