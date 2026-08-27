import { beforeEach, describe, expect, it, vi } from "vitest";

import { GetOrderUseCase } from "./get-order.use-case.js";
import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryDeliveriesRepository } from "../repositories/in-memory-deliveries-repository.js";
import { InMemoryDeliveryHistoryRepository } from "../repositories/in-memory-delivery-history-repository.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { OrderType } from "../repositories/orders-repository.js";
import { randomUUID } from "node:crypto";

describe("GetOrderUseCase", () => {
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let deliveriesRepository: InMemoryDeliveriesRepository;
  let deliveryHistoryRepository: InMemoryDeliveryHistoryRepository;
  let useCase: GetOrderUseCase;

  beforeEach(() => {
    ordersRepository = new InMemoryOrdersRepository();
    orderItemsRepository = new InMemoryOrderItemsRepository();
    orderHistoryRepository = new InMemoryOrderHistoryRepository();
    deliveriesRepository = new InMemoryDeliveriesRepository();
    deliveryHistoryRepository = new InMemoryDeliveryHistoryRepository();
    useCase = new GetOrderUseCase(
      ordersRepository,
      orderItemsRepository,
      orderHistoryRepository,
      deliveriesRepository,
      deliveryHistoryRepository,
    );
  });

  async function createOrder(
    type: OrderType,
    restaurantId: string = randomUUID(),
  ) {
    return await ordersRepository.create({
      restaurantId,
      customerId: randomUUID(),
      type,
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 5000,
      deliveryFee: type === "DELIVERY" ? 1000 : 0,
      total: type === "DELIVERY" ? 6000 : 5000,
      customerName: "Matheus",
      customerPhone: "11999",
      deliveryStreet: type === "DELIVERY" ? "Rua A" : null,
      deliveryNumber: type === "DELIVERY" ? "100" : null,
      deliveryComplement: null,
      deliveryNeighborhood: type === "DELIVERY" ? "Centro" : null,
      deliveryCity: type === "DELIVERY" ? "Guarujá" : null,
      deliveryState: type === "DELIVERY" ? "SP" : null,
      deliveryZipCode: type === "DELIVERY" ? "11410-000" : null,
      observation: null,
    });
  }

  it("deve retornar o pedido e os itens corretamente preservando os snapshots", async () => {
    const restaurantId = randomUUID();
    const order = await ordersRepository.create({
      restaurantId,
      customerId: randomUUID(),
      type: "DELIVERY",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 5000,
      deliveryFee: 1000,
      total: 6000,
      customerName: "Matheus",
      customerPhone: "11999",
      deliveryStreet: "Rua A",
      deliveryNumber: "100",
      deliveryComplement: null,
      deliveryNeighborhood: "Centro",
      deliveryCity: "Guarujá",
      deliveryState: "SP",
      deliveryZipCode: "11410-000",
      observation: null,
    });

    await orderItemsRepository.createMany([
      {
        orderId: order.id,
        productId: randomUUID(),
        productName: "Pizza Snapshot",
        unitPrice: 5000,
        quantity: 1,
        subtotal: 5000,
      },
    ]);

    const tiedDate = new Date("2026-08-26T12:01:00.000Z");
    orderHistoryRepository.items.push(
      {
        id: "00000000-0000-4000-8000-000000000003",
        orderId: order.id,
        action: "CREATED",
        previousStatus: null,
        newStatus: "PENDING",
        observation: null,
        createdAt: new Date("2026-08-26T12:00:00.000Z"),
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        orderId: order.id,
        action: "STATUS_CHANGED",
        previousStatus: "PENDING",
        newStatus: "CONFIRMED",
        observation: null,
        createdAt: tiedDate,
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        orderId: order.id,
        action: "PAYMENT_CONFIRMED",
        previousStatus: "CONFIRMED",
        newStatus: "CONFIRMED",
        observation: null,
        createdAt: tiedDate,
      },
      {
        id: randomUUID(),
        orderId: randomUUID(),
        action: "CREATED",
        previousStatus: null,
        newStatus: "PENDING",
        observation: null,
        createdAt: new Date("2026-08-26T11:00:00.000Z"),
      },
    );

    const result = await useCase.execute({ restaurantId, orderId: order.id });

    expect(result.order.id).toBe(order.id);
    expect(result.order.customerName).toBe("Matheus");
    expect(result.order.deliveryStreet).toBe("Rua A");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].productName).toBe("Pizza Snapshot");
    expect(result.items[0].unitPrice).toBe(5000);
    expect(result.history.map((history) => history.action)).toEqual([
      "CREATED",
      "PAYMENT_CONFIRMED",
      "STATUS_CHANGED",
    ]);
    expect(result.history.map((history) => history.id)).toEqual([
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ]);
    expect(result.delivery).toBeNull();
  });

  it("deve retornar histórico vazio quando o pedido não tiver eventos", async () => {
    const restaurantId = randomUUID();
    const order = await ordersRepository.create({
      restaurantId,
      customerId: randomUUID(),
      type: "PICKUP",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 5000,
      deliveryFee: 0,
      total: 5000,
      customerName: "Matheus",
      customerPhone: "11999",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });

    const result = await useCase.execute({ restaurantId, orderId: order.id });

    expect(result.history).toEqual([]);
    expect(result.delivery).toBeNull();
  });

  it.each(["PICKUP", "DINE_IN"] as const)(
    "deve retornar delivery null para %s sem consultar Delivery",
    async (type) => {
      const restaurantId = randomUUID();
      const order = await createOrder(type, restaurantId);
      const findDeliverySpy = vi.spyOn(deliveriesRepository, "findByOrderId");

      const result = await useCase.execute({ restaurantId, orderId: order.id });

      expect(result.delivery).toBeNull();
      expect(findDeliverySpy).not.toHaveBeenCalled();
    },
  );

  it("deve retornar delivery null para DELIVERY sem despacho criado", async () => {
    const restaurantId = randomUUID();
    const order = await createOrder("DELIVERY", restaurantId);
    const findHistorySpy = vi.spyOn(
      deliveryHistoryRepository,
      "findManyByDeliveryId",
    );

    const result = await useCase.execute({ restaurantId, orderId: order.id });

    expect(result.delivery).toBeNull();
    expect(findHistorySpy).not.toHaveBeenCalled();
  });

  it("deve retornar Delivery e somente seu histórico em ordem determinística", async () => {
    const restaurantId = randomUUID();
    const order = await createOrder("DELIVERY", restaurantId);
    const delivery = await deliveriesRepository.create(order.id);
    const tiedDate = new Date("2026-08-26T12:01:00.000Z");

    deliveryHistoryRepository.items.push(
      {
        id: "00000000-0000-4000-8000-000000000003",
        deliveryId: delivery.id,
        action: "DELIVERY_CREATED",
        previousStatus: "PENDING",
        newStatus: "PENDING",
        observation: null,
        createdAt: new Date("2026-08-26T12:00:00.000Z"),
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        deliveryId: delivery.id,
        action: "DELIVERY_STARTED",
        previousStatus: "PENDING",
        newStatus: "OUT_FOR_DELIVERY",
        observation: null,
        createdAt: tiedDate,
      },
      {
        id: "00000000-0000-4000-8000-000000000001",
        deliveryId: delivery.id,
        action: "DELIVERY_COMPLETED",
        previousStatus: "OUT_FOR_DELIVERY",
        newStatus: "DELIVERED",
        observation: null,
        createdAt: tiedDate,
      },
      {
        id: randomUUID(),
        deliveryId: randomUUID(),
        action: "DELIVERY_CREATED",
        previousStatus: "PENDING",
        newStatus: "PENDING",
        observation: null,
        createdAt: new Date("2026-08-26T11:00:00.000Z"),
      },
    );

    const result = await useCase.execute({ restaurantId, orderId: order.id });

    expect(result.delivery).toMatchObject({
      id: delivery.id,
      orderId: order.id,
      status: "PENDING",
    });
    expect(result.delivery?.history.map((history) => history.action)).toEqual([
      "DELIVERY_CREATED",
      "DELIVERY_COMPLETED",
      "DELIVERY_STARTED",
    ]);
    expect(result.delivery?.history.map((history) => history.id)).toEqual([
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000001",
      "00000000-0000-4000-8000-000000000002",
    ]);
  });

  it("deve rejeitar a consulta caso o pedido não exista", async () => {
    const findDeliverySpy = vi.spyOn(deliveriesRepository, "findByOrderId");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
    expect(findDeliverySpy).not.toHaveBeenCalled();
  });

  it("deve rejeitar pedido de outro restaurante sem hidratar os itens", async () => {
    const order = await ordersRepository.create({
      restaurantId: randomUUID(),
      customerId: randomUUID(),
      type: "PICKUP",
      status: "PENDING",
      paymentStatus: "PENDING",
      subtotal: 5000,
      deliveryFee: 0,
      total: 5000,
      customerName: "Matheus",
      customerPhone: "11999",
      deliveryStreet: null,
      deliveryNumber: null,
      deliveryComplement: null,
      deliveryNeighborhood: null,
      deliveryCity: null,
      deliveryState: null,
      deliveryZipCode: null,
      observation: null,
    });
    const findItemsSpy = vi.spyOn(
      orderItemsRepository,
      "findManyByOrderIds",
    );
    const findHistorySpy = vi.spyOn(
      orderHistoryRepository,
      "findManyByOrderId",
    );
    const findDeliverySpy = vi.spyOn(deliveriesRepository, "findByOrderId");

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        orderId: order.id,
      }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
    expect(findItemsSpy).not.toHaveBeenCalled();
    expect(findHistorySpy).not.toHaveBeenCalled();
    expect(findDeliverySpy).not.toHaveBeenCalled();
  });
});
