import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrderTransactionManager } from "../repositories/in-memory-order-transaction-manager.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidOrderStatusTransitionError } from "../errors/invalid-order-status-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
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

  it("deve realizar uma transição válida (PENDING -> CONFIRMED) e registrar histórico", async () => {
    const order = await createOrder("PENDING");

    await useCase.execute({ orderId: order.id, status: "CONFIRMED" });

    const updatedOrder = await ordersRepository.findById(order.id);
    expect(updatedOrder?.status).toBe("CONFIRMED");

    expect(orderHistoryRepository.items).toHaveLength(1);
    expect(orderHistoryRepository.items[0].action).toBe("STATUS_CHANGED");
    expect(orderHistoryRepository.items[0].previousStatus).toBe("PENDING");
    expect(orderHistoryRepository.items[0].newStatus).toBe("CONFIRMED");
  });

  it("deve rejeitar uma transição inválida e não gravar histórico (PENDING -> DELIVERED)", async () => {
    const order = await createOrder("PENDING");

    await expect(
      useCase.execute({ orderId: order.id, status: "DELIVERED" }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

    const unchangedOrder = await ordersRepository.findById(order.id);
    expect(unchangedOrder?.status).toBe("PENDING");
    expect(orderHistoryRepository.items).toHaveLength(0);
  });

  it("deve rejeitar transições a partir de estados finais (DELIVERED, CANCELLED)", async () => {
    const deliveredOrder = await createOrder("DELIVERED");
    await expect(
      useCase.execute({ orderId: deliveredOrder.id, status: "CANCELLED" }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);

    const cancelledOrder = await createOrder("CANCELLED");
    await expect(
      useCase.execute({ orderId: cancelledOrder.id, status: "PENDING" }),
    ).rejects.toBeInstanceOf(InvalidOrderStatusTransitionError);
  });

  it("deve rejeitar caso o pedido não exista", async () => {
    await expect(
      useCase.execute({ orderId: randomUUID(), status: "CONFIRMED" }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});
