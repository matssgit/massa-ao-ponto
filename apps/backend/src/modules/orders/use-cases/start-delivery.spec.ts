import { beforeEach, describe, expect, it, vi } from "vitest";

import { InMemoryDeliveriesRepository } from "../repositories/in-memory-deliveries-repository.js";
import { InMemoryDeliveryHistoryRepository } from "../repositories/in-memory-delivery-history-repository.js";
import { InMemoryDeliveryTransactionManager } from "../repositories/in-memory-delivery-transaction-manager.js";
import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { StartDeliveryUseCase } from "./start-delivery.use-case.js";
import { randomUUID } from "node:crypto";

describe("StartDeliveryUseCase", () => {
  let deliveriesRepository: InMemoryDeliveriesRepository;
  let deliveryHistoryRepository: InMemoryDeliveryHistoryRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let useCase: StartDeliveryUseCase;

  beforeEach(() => {
    deliveriesRepository = new InMemoryDeliveriesRepository();
    deliveryHistoryRepository = new InMemoryDeliveryHistoryRepository();
    ordersRepository = new InMemoryOrdersRepository();
    orderHistoryRepository = new InMemoryOrderHistoryRepository();
    useCase = new StartDeliveryUseCase(
      new InMemoryDeliveryTransactionManager(
        deliveriesRepository,
        deliveryHistoryRepository,
        ordersRepository,
        orderHistoryRepository,
      ),
    );
  });

  async function createReadyOrderWithDelivery() {
    const order = await ordersRepository.create({
      restaurantId: randomUUID(),
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "READY",
      paymentStatus: "PENDING",
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      customerName: "Cliente",
      customerPhone: "1",
      deliveryStreet: "Rua A",
      deliveryNumber: "123",
      deliveryComplement: null,
      deliveryNeighborhood: "Bairro",
      deliveryCity: "Cidade",
      deliveryState: "SP",
      deliveryZipCode: "00000-000",
      observation: null,
    });
    const delivery = await deliveriesRepository.create(order.id);
    return { order, delivery };
  }

  it("deve iniciar Delivery do próprio tenant e registrar ambos os histories", async () => {
    const { order, delivery } = await createReadyOrderWithDelivery();
    const findOrderForUpdate = vi.spyOn(
      ordersRepository,
      "findByIdAndRestaurantIdForUpdate",
    );

    await useCase.execute({
      restaurantId: order.restaurantId,
      orderId: order.id,
    });

    expect(findOrderForUpdate).toHaveBeenCalledWith(
      order.id,
      order.restaurantId,
    );
    expect(order.status).toBe("OUT_FOR_DELIVERY");
    expect(delivery.status).toBe("OUT_FOR_DELIVERY");
    expect(orderHistoryRepository.items).toHaveLength(1);
    expect(deliveryHistoryRepository.items).toHaveLength(1);
  });

  it("deve tratar cross-tenant como Order inexistente antes de consultar Delivery", async () => {
    const { order, delivery } = await createReadyOrderWithDelivery();
    const findDeliveryForUpdate = vi.spyOn(
      deliveriesRepository,
      "findByOrderIdForUpdate",
    );

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: order.id,
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);

    expect(findDeliveryForUpdate).not.toHaveBeenCalled();
    expect(order.status).toBe("READY");
    expect(delivery.status).toBe("PENDING");
    expect(orderHistoryRepository.items).toHaveLength(0);
    expect(deliveryHistoryRepository.items).toHaveLength(0);
  });

  it("deve tratar Order inexistente como 404 antes de consultar Delivery", async () => {
    const findDeliveryForUpdate = vi.spyOn(
      deliveriesRepository,
      "findByOrderIdForUpdate",
    );

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);

    expect(findDeliveryForUpdate).not.toHaveBeenCalled();
  });
});
