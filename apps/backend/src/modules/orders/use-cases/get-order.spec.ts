import { beforeEach, describe, expect, it } from "vitest";

import { GetOrderUseCase } from "./get-order.use-case.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { OrderNotFoundError } from "../errors/order-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("GetOrderUseCase", () => {
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let useCase: GetOrderUseCase;

  beforeEach(() => {
    ordersRepository = new InMemoryOrdersRepository();
    orderItemsRepository = new InMemoryOrderItemsRepository();
    useCase = new GetOrderUseCase(ordersRepository, orderItemsRepository);
  });

  it("deve retornar o pedido e os itens corretamente preservando os snapshots", async () => {
    const order = await ordersRepository.create({
      restaurantId: randomUUID(),
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

    const result = await useCase.execute({ orderId: order.id });

    expect(result.order.id).toBe(order.id);
    expect(result.order.customerName).toBe("Matheus");
    expect(result.order.deliveryStreet).toBe("Rua A");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].productName).toBe("Pizza Snapshot");
    expect(result.items[0].unitPrice).toBe(5000);
  });

  it("deve rejeitar a consulta caso o pedido não exista", async () => {
    await expect(
      useCase.execute({ orderId: randomUUID() }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});
