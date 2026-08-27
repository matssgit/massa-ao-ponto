import {
  OrderPaymentStatus,
  OrderStatus,
} from "../repositories/orders-repository.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrderTransactionManager } from "../repositories/in-memory-order-transaction-manager.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidOrderPaymentTransitionError } from "../errors/invalid-order-payment-transition-error.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { PayOrderUseCase } from "./pay-order.use-case.js";
import { randomUUID } from "node:crypto";

describe("PayOrderUseCase", () => {
  let ordersRepository: InMemoryOrdersRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let transactionManager: InMemoryOrderTransactionManager;
  let useCase: PayOrderUseCase;

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
    useCase = new PayOrderUseCase(transactionManager);
  });

  async function createOrder(
    status: OrderStatus,
    paymentStatus: OrderPaymentStatus,
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

  it("deve confirmar o pagamento de um pedido e registrar no histórico", async () => {
    const order = await createOrder("PENDING", "PENDING");
    const findForUpdate = vi.spyOn(
      ordersRepository,
      "findByIdAndRestaurantIdForUpdate",
    );

    const result = await useCase.execute({
      restaurantId: order.restaurantId,
      orderId: order.id,
    });

    expect(result.paymentStatus).toBe("PAID");

    const updated = await ordersRepository.findById(order.id);
    expect(updated?.paymentStatus).toBe("PAID");

    expect(orderHistoryRepository.items).toHaveLength(1);
    expect(orderHistoryRepository.items[0].action).toBe("PAYMENT_CONFIRMED");
    expect(orderHistoryRepository.items[0].previousStatus).toBe("PENDING");
    expect(orderHistoryRepository.items[0].newStatus).toBe("PENDING");
    expect(findForUpdate).toHaveBeenCalledWith(order.id, order.restaurantId);
  });

  it("deve rejeitar se o pedido já estiver pago", async () => {
    const order = await createOrder("CONFIRMED", "PAID");
    await expect(
      useCase.execute({
        restaurantId: order.restaurantId,
        orderId: order.id,
      }),
    ).rejects.toBeInstanceOf(InvalidOrderPaymentTransitionError);
  });

  it("deve rejeitar pagamento de pedidos CANCELLED ou DELIVERED", async () => {
    const cancelledOrder = await createOrder("CANCELLED", "PENDING");
    await expect(
      useCase.execute({
        restaurantId: cancelledOrder.restaurantId,
        orderId: cancelledOrder.id,
      }),
    ).rejects.toBeInstanceOf(InvalidOrderPaymentTransitionError);

    const deliveredOrder = await createOrder("DELIVERED", "PENDING");
    await expect(
      useCase.execute({
        restaurantId: deliveredOrder.restaurantId,
        orderId: deliveredOrder.id,
      }),
    ).rejects.toBeInstanceOf(InvalidOrderPaymentTransitionError);
  });

  it("deve rejeitar se o pedido não existir", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it("deve tratar pedido de outro restaurante como não encontrado sem pagar ou gravar histórico", async () => {
    const order = await createOrder("PENDING", "PENDING");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: order.id,
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);

    expect(order.paymentStatus).toBe("PENDING");
    expect(orderHistoryRepository.items).toHaveLength(0);
  });
});
