import { beforeEach, describe, expect, it, vi } from "vitest";

import { CreateDeliveryUseCase } from "./create-delivery.use-case.js";
import { InMemoryDeliveriesRepository } from "../repositories/in-memory-deliveries-repository.js";
import { InMemoryDeliveryHistoryRepository } from "../repositories/in-memory-delivery-history-repository.js";
import { InMemoryDeliveryTransactionManager } from "../repositories/in-memory-delivery-transaction-manager.js";
import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("CreateDeliveryUseCase", () => {
  let deliveriesRepository: InMemoryDeliveriesRepository;
  let deliveryHistoryRepository: InMemoryDeliveryHistoryRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let useCase: CreateDeliveryUseCase;

  beforeEach(() => {
    deliveriesRepository = new InMemoryDeliveriesRepository();
    deliveryHistoryRepository = new InMemoryDeliveryHistoryRepository();
    ordersRepository = new InMemoryOrdersRepository();
    orderHistoryRepository = new InMemoryOrderHistoryRepository();
    useCase = new CreateDeliveryUseCase(
      new InMemoryDeliveryTransactionManager(
        deliveriesRepository,
        deliveryHistoryRepository,
        ordersRepository,
        orderHistoryRepository,
      ),
    );
  });

  async function createOrder() {
    return ordersRepository.create({
      restaurantId: randomUUID(),
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "PREPARING",
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
  }

  it("deve criar Delivery do próprio tenant e registrar history", async () => {
    const order = await createOrder();
    const findOrderForUpdate = vi.spyOn(
      ordersRepository,
      "findByIdAndRestaurantIdForUpdate",
    );

    const delivery = await useCase.execute({
      restaurantId: order.restaurantId,
      orderId: order.id,
    });

    expect(delivery.status).toBe("PENDING");
    expect(findOrderForUpdate).toHaveBeenCalledWith(
      order.id,
      order.restaurantId,
    );
    expect(deliveriesRepository.items).toHaveLength(1);
    expect(deliveryHistoryRepository.items).toHaveLength(1);
    expect(deliveryHistoryRepository.items[0].action).toBe("DELIVERY_CREATED");
  });

  it("deve tratar cross-tenant como Order inexistente sem consultar Delivery", async () => {
    const order = await createOrder();
    const findDelivery = vi.spyOn(deliveriesRepository, "findByOrderId");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: order.id,
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);

    expect(findDelivery).not.toHaveBeenCalled();
    expect(deliveriesRepository.items).toHaveLength(0);
    expect(deliveryHistoryRepository.items).toHaveLength(0);
    expect(order.status).toBe("PREPARING");
  });

  it("deve tratar Order inexistente como 404 sem consultar Delivery", async () => {
    const findDelivery = vi.spyOn(deliveriesRepository, "findByOrderId");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);

    expect(findDelivery).not.toHaveBeenCalled();
  });
});
