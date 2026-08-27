import { beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrderTransactionManager } from "../repositories/in-memory-order-transaction-manager.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import {
  OrderStatus,
  OrderType,
} from "../repositories/orders-repository.js";
import { UpdateOrderStatusUseCase } from "./update-order-status.use-case.js";
import { randomUUID } from "node:crypto";

describe("UpdateOrderStatusUseCase", () => {
  let ordersRepository: InMemoryOrdersRepository;
  let transactionManager: InMemoryOrderTransactionManager;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let useCase: UpdateOrderStatusUseCase;

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
    useCase = new UpdateOrderStatusUseCase(transactionManager);
  });

  async function createOrder(
    status: OrderStatus,
    type: OrderType = "DELIVERY",
  ) {
    return await ordersRepository.create({
      restaurantId: randomUUID(),
      customerId: randomUUID(),
      type,
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

  it("deve realizar uma transição válida (PENDING -> CONFIRMED) e registrar histórico", async () => {
    const order = await createOrder("PENDING");
    const findForUpdate = vi.spyOn(
      ordersRepository,
      "findByIdAndRestaurantIdForUpdate",
    );

    await useCase.execute({
      restaurantId: order.restaurantId,
      orderId: order.id,
      status: "CONFIRMED",
    });

    const updatedOrder = await ordersRepository.findById(order.id);
    expect(updatedOrder?.status).toBe("CONFIRMED");

    expect(orderHistoryRepository.items).toHaveLength(1);
    expect(orderHistoryRepository.items[0].action).toBe("STATUS_CHANGED");
    expect(orderHistoryRepository.items[0].previousStatus).toBe("PENDING");
    expect(orderHistoryRepository.items[0].newStatus).toBe("CONFIRMED");
    expect(findForUpdate).toHaveBeenCalledWith(order.id, order.restaurantId);
  });

  it("deve rejeitar uma transição inválida e não gravar histórico (PENDING -> DELIVERED)", async () => {
    const order = await createOrder("PENDING");

    await expect(
      useCase.execute({
        restaurantId: order.restaurantId,
        orderId: order.id,
        status: "DELIVERED",
      }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

    const unchangedOrder = await ordersRepository.findById(order.id);
    expect(unchangedOrder?.status).toBe("PENDING");
    expect(orderHistoryRepository.items).toHaveLength(0);
  });

  it.each([
    ["READY", "OUT_FOR_DELIVERY"],
    ["OUT_FOR_DELIVERY", "DELIVERED"],
  ] as const)(
    "deve rejeitar a transição logística de DELIVERY pela atualização genérica (%s -> %s)",
    async (currentStatus, nextStatus) => {
      const order = await createOrder(currentStatus, "DELIVERY");

      await expect(
        useCase.execute({
          restaurantId: order.restaurantId,
          orderId: order.id,
          status: nextStatus,
        }),
      ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

      expect(order.status).toBe(currentStatus);
      expect(orderHistoryRepository.items).toHaveLength(0);
    },
  );

  it.each(["PICKUP", "DINE_IN"] as const)(
    "deve permitir READY -> DELIVERED para %s",
    async (type) => {
      const order = await createOrder("READY", type);

      await useCase.execute({
        restaurantId: order.restaurantId,
        orderId: order.id,
        status: "DELIVERED",
      });

      expect(order.status).toBe("DELIVERED");
      expect(orderHistoryRepository.items).toHaveLength(1);
      expect(orderHistoryRepository.items[0]).toMatchObject({
        action: "STATUS_CHANGED",
        previousStatus: "READY",
        newStatus: "DELIVERED",
      });
    },
  );

  it.each(["PICKUP", "DINE_IN"] as const)(
    "deve rejeitar READY -> OUT_FOR_DELIVERY para %s",
    async (type) => {
      const order = await createOrder("READY", type);

      await expect(
        useCase.execute({
          restaurantId: order.restaurantId,
          orderId: order.id,
          status: "OUT_FOR_DELIVERY",
        }),
      ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

      expect(order.status).toBe("READY");
      expect(orderHistoryRepository.items).toHaveLength(0);
    },
  );

  it("deve rejeitar CANCELLED pela atualização genérica", async () => {
    const order = await createOrder("PENDING");

    await expect(
      useCase.execute({
        restaurantId: order.restaurantId,
        orderId: order.id,
        status: "CANCELLED",
      }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

    expect(order.status).toBe("PENDING");
    expect(orderHistoryRepository.items).toHaveLength(0);
  });

  it("deve rejeitar transições a partir de estados finais (DELIVERED, CANCELLED)", async () => {
    const deliveredOrder = await createOrder("DELIVERED");
    await expect(
      useCase.execute({
        restaurantId: deliveredOrder.restaurantId,
        orderId: deliveredOrder.id,
        status: "CANCELLED",
      }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

    const cancelledOrder = await createOrder("CANCELLED");
    await expect(
      useCase.execute({
        restaurantId: cancelledOrder.restaurantId,
        orderId: cancelledOrder.id,
        status: "PENDING",
      }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);
  });

  it("deve rejeitar caso o pedido não exista", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: randomUUID(),
        status: "CONFIRMED",
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it("deve tratar pedido de outro restaurante como não encontrado sem alterar estado ou histórico", async () => {
    const order = await createOrder("PENDING");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: order.id,
        status: "CONFIRMED",
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);

    expect(order.status).toBe("PENDING");
    expect(orderHistoryRepository.items).toHaveLength(0);
  });
});
