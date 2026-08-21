import { beforeEach, describe, expect, it } from "vitest";

import { CreateOrderUseCase } from "./create-order.use-case.js";
import { CustomerNotFoundError } from "../../customers/errors/customer-not-found-error.js";
import { DuplicateProductInOrderError } from "../errors/duplicate-product-in-order-error.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrderTransactionManager } from "../repositories/in-memory-order-transaction-manager.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryProductsRepository } from "../../products/repositories/in-memory-products-repository.js";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { InvalidDeliveryFeeError } from "../errors/invalid-delivery-fee-error.js";
import { InvalidItemQuantityError } from "../errors/invalid-item-quantity-error.js";
import { MissingDeliveryAddressError } from "../errors/missing-delivery-address-error.js";
import { ProductInactiveError } from "../errors/product-inactive-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductRestaurantMismatchError } from "../errors/product-restaurant-mismatch-error.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("CreateOrderUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let customersRepository: InMemoryCustomersRepository;
  let productsRepository: InMemoryProductsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let transactionManager: InMemoryOrderTransactionManager;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    customersRepository = new InMemoryCustomersRepository();
    productsRepository = new InMemoryProductsRepository();
    ordersRepository = new InMemoryOrdersRepository();
    orderItemsRepository = new InMemoryOrderItemsRepository();
    orderHistoryRepository = new InMemoryOrderHistoryRepository();
    transactionManager = new InMemoryOrderTransactionManager(
      ordersRepository,
      orderItemsRepository,
      orderHistoryRepository,
    );
    useCase = new CreateOrderUseCase(
      restaurantsRepository,
      customersRepository,
      productsRepository,
      transactionManager,
    );
  });

  async function createDeps() {
    const restaurantId = randomUUID();
    restaurantsRepository.items.push({
      id: restaurantId,
      name: "Rest",
      address: "Rua",
      phone: "11",
      timezone: "UTC",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const customerId = randomUUID();
    customersRepository.items.push({
      id: customerId,
      name: "João",
      phone: "1199",
      email: null,
    });

    const p1 = await productsRepository.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Pizza Calabresa",
      price: 3990,
      displayOrder: 1,
    });
    const p2 = await productsRepository.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Guaraná",
      price: 1000,
      displayOrder: 2,
    });

    return { restaurantId, customerId, p1, p2 };
  }

  it("deve criar o pedido, itens, snapshots, calcular totais e registrar histórico", async () => {
    const { restaurantId, customerId, p1, p2 } = await createDeps();

    const result = await useCase.execute({
      restaurantId,
      customerId,
      type: "DELIVERY",
      items: [
        { productId: p1.id, quantity: 2 },
        { productId: p2.id, quantity: 1 },
      ],
      deliveryFee: 500,
      deliveryAddress: {
        street: "Rua A",
        number: "10",
        neighborhood: "Centro",
        city: "SP",
        state: "SP",
        zipCode: "000",
      },
    });

    expect(result.id).toBeDefined();
    expect(result.customerName).toBe("João"); // Snapshot
    expect(result.subtotal).toBe(3990 * 2 + 1000); // 8980
    expect(result.total).toBe(8980 + 500); // 9480

    expect(orderItemsRepository.items).toHaveLength(2);
    expect(orderItemsRepository.items[0].productName).toBe("Pizza Calabresa");
    expect(orderItemsRepository.items[0].unitPrice).toBe(3990);
    expect(orderItemsRepository.items[0].subtotal).toBe(7980);

    expect(orderHistoryRepository.items).toHaveLength(1);
    expect(orderHistoryRepository.items[0].action).toBe("CREATED");
    expect(orderHistoryRepository.items[0].newStatus).toBe("PENDING");
  });

  it("deve manter o preço do pedido inalterado caso o catálogo mude depois (snapshot)", async () => {
    const { restaurantId, customerId, p1 } = await createDeps();

    const order = await useCase.execute({
      restaurantId,
      customerId,
      type: "PICKUP",
      items: [{ productId: p1.id, quantity: 1 }],
      deliveryFee: 0,
    });

    // Alterando o preço do produto no catálogo após a criação do pedido
    productsRepository.items[0].price = 4990;

    const item = orderItemsRepository.items.find((i) => i.orderId === order.id);
    expect(item?.unitPrice).toBe(3990);
  });

  it("deve lançar erro se tentar inserir o mesmo produto duas vezes no mesmo pedido", async () => {
    const { restaurantId, customerId, p1 } = await createDeps();
    await expect(
      useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [
          { productId: p1.id, quantity: 1 },
          { productId: p1.id, quantity: 2 },
        ],
        deliveryFee: 0,
      }),
    ).rejects.toBeInstanceOf(DuplicateProductInOrderError);
  });

  it("deve validar tipo de pedido PICKUP (deliveryFee obrigatório = 0)", async () => {
    const { restaurantId, customerId, p1 } = await createDeps();
    await expect(
      useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [{ productId: p1.id, quantity: 1 }],
        deliveryFee: 1000,
      }),
    ).rejects.toBeInstanceOf(InvalidDeliveryFeeError);
  });

  it("deve validar tipo de pedido DELIVERY (endereço obrigatório)", async () => {
    const { restaurantId, customerId, p1 } = await createDeps();
    await expect(
      useCase.execute({
        restaurantId,
        customerId,
        type: "DELIVERY",
        items: [{ productId: p1.id, quantity: 1 }],
        deliveryFee: 1000,
      }),
    ).rejects.toBeInstanceOf(MissingDeliveryAddressError);
  });

  it("deve falhar se produto inativo ou de outro restaurante", async () => {
    const { restaurantId, customerId, p1 } = await createDeps();

    productsRepository.items[0].active = false;
    await expect(
      useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [{ productId: p1.id, quantity: 1 }],
        deliveryFee: 0,
      }),
    ).rejects.toBeInstanceOf(ProductInactiveError);

    productsRepository.items[0].active = true;
    productsRepository.items[0].restaurantId = randomUUID();

    await expect(
      useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [{ productId: p1.id, quantity: 1 }],
        deliveryFee: 0,
      }),
    ).rejects.toBeInstanceOf(ProductRestaurantMismatchError);
  });
});
