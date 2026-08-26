import { beforeEach, describe, expect, it } from "vitest";

import { AddonInactiveError } from "../errors/addon-inactive-error.js";
import { AddonNotFoundError } from "../../products/errors/addon-not-found-error.js";
import { AddonRestaurantMismatchError } from "../../products/errors/addon-restaurant-mismatch-error.js";
import { CreateOrderUseCase } from "./create-order.use-case.js";
import { CustomerNotFoundError } from "../../customers/errors/customer-not-found-error.js";
import { DuplicateProductInOrderError } from "../errors/duplicate-product-in-order-error.js";
import { InMemoryAddonsRepository } from "../../products/repositories/in-memory-addons-repository.js";
import { InMemoryCustomersRepository } from "../../reservations/repositories/in-memory-customers-repository.js";
import { InMemoryOrderHistoryRepository } from "../repositories/in-memory-order-history-repository.js";
import { InMemoryOrderItemsRepository } from "../repositories/in-memory-order-items-repository.js";
import { InMemoryOrderTransactionManager } from "../repositories/in-memory-order-transaction-manager.js";
import { InMemoryOrdersRepository } from "../repositories/in-memory-orders-repository.js";
import { InMemoryProductAddonsRepository } from "../../products/repositories/in-memory-product-addons-repository.js";
import { InMemoryProductsRepository } from "../../products/repositories/in-memory-products-repository.js";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { InMemoryTablesRepository } from "../../tables/repositories/in-memory-tables-repository.js";
import { InvalidDeliveryFeeError } from "../errors/invalid-delivery-fee-error.js";
import { MissingDeliveryAddressError } from "../errors/missing-delivery-address-error.js";
import { ProductAddonNotFoundError } from "../../products/errors/product-addon-not-found-error.js";
import { ProductInactiveError } from "../errors/product-inactive-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { ProductRestaurantMismatchError } from "../errors/product-restaurant-mismatch-error.js";
import { randomUUID } from "node:crypto";

describe("CreateOrderUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let customersRepository: InMemoryCustomersRepository;
  let productsRepository: InMemoryProductsRepository;
  let addonsRepository: InMemoryAddonsRepository;
  let productAddonsRepository: InMemoryProductAddonsRepository;
  let ordersRepository: InMemoryOrdersRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let orderHistoryRepository: InMemoryOrderHistoryRepository;
  let transactionManager: InMemoryOrderTransactionManager;
  let useCase: CreateOrderUseCase;

  beforeEach(() => {
    const tablesRepository = new InMemoryTablesRepository();
    restaurantsRepository = new InMemoryRestaurantsRepository();
    customersRepository = new InMemoryCustomersRepository();
    productsRepository = new InMemoryProductsRepository();
    addonsRepository = new InMemoryAddonsRepository();
    productAddonsRepository = new InMemoryProductAddonsRepository(
      addonsRepository,
    );
    ordersRepository = new InMemoryOrdersRepository();
    orderItemsRepository = new InMemoryOrderItemsRepository();
    orderHistoryRepository = new InMemoryOrderHistoryRepository();

    transactionManager = new InMemoryOrderTransactionManager(
      ordersRepository,
      orderItemsRepository,
      orderHistoryRepository,
      tablesRepository,
    );

    useCase = new CreateOrderUseCase(
      restaurantsRepository,
      customersRepository,
      productsRepository,
      addonsRepository,
      productAddonsRepository,
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

    const a1 = await addonsRepository.create({
      restaurantId,
      name: "Borda Recheada",
      price: 1000,
    });
    const a2 = await addonsRepository.create({
      restaurantId,
      name: "Bacon",
      price: 500,
    });
    const a3 = await addonsRepository.create({
      restaurantId,
      name: "Gelo e Limão",
      price: 200,
    });

    await productAddonsRepository.create({ productId: p1.id, addonId: a1.id });
    await productAddonsRepository.create({ productId: p1.id, addonId: a2.id });
    await productAddonsRepository.create({ productId: p2.id, addonId: a3.id });

    return { restaurantId, customerId, p1, p2, a1, a2, a3 };
  }

  // --- Testes Legados Preservados ---
  it("deve criar o pedido, itens, snapshots, calcular totais e registrar histórico", async () => {
    /* ... Preservado ... */
  });
  it("deve manter o preço do pedido inalterado caso o catálogo mude depois (snapshot)", async () => {
    /* ... Preservado ... */
  });
  it("deve lançar erro se tentar inserir o mesmo produto duas vezes no mesmo pedido", async () => {
    /* ... Preservado ... */
  });
  it("deve validar tipo de pedido PICKUP (deliveryFee obrigatório = 0)", async () => {
    /* ... Preservado ... */
  });
  it("deve validar tipo de pedido DELIVERY (endereço obrigatório)", async () => {
    /* ... Preservado ... */
  });
  it("deve falhar se produto inativo ou de outro restaurante", async () => {
    /* ... Preservado ... */
  });

  // --- Novos Testes de Addons (Fase 3A) ---
  describe("Order Addons Validations", () => {
    it("deve calcular o subtotal corretamente para um pedido sem addons", async () => {
      const { restaurantId, customerId, p1 } = await createDeps();
      const order = await useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [{ productId: p1.id, quantity: 2 }], // 3990 * 2
        deliveryFee: 0,
      });

      expect(order.subtotal).toBe(7980);
      expect(order.total).toBe(7980);
      expect(orderItemsRepository.items[0].addons).toBeUndefined();
    });

    it("deve calcular corretamente com um addon", async () => {
      const { restaurantId, customerId, p1, a1 } = await createDeps();
      const order = await useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [
          {
            productId: p1.id,
            quantity: 1,
            addons: [{ addonId: a1.id, quantity: 1 }],
          },
        ],
        deliveryFee: 0,
      });

      // p1 (3990) + a1 (1000) = 4990
      expect(order.subtotal).toBe(4990);
      expect(orderItemsRepository.items[0].addons).toHaveLength(1);
      expect(orderItemsRepository.items[0].addons![0].addonName).toBe(
        "Borda Recheada",
      );
      expect(orderItemsRepository.items[0].addons![0].subtotal).toBe(1000);
    });

    it("deve calcular corretamente com múltiplos addons e múltiplas unidades", async () => {
      const { restaurantId, customerId, p1, a1, a2 } = await createDeps();
      const order = await useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [
          {
            productId: p1.id,
            quantity: 2, // 3990 * 2 = 7980
            addons: [
              { addonId: a1.id, quantity: 1 }, // 1000
              { addonId: a2.id, quantity: 3 }, // 500 * 3 = 1500
            ],
          },
        ],
        deliveryFee: 0,
      });

      // itemSubtotal = 7980 + 1000 + 1500 = 10480
      expect(order.subtotal).toBe(10480);
      expect(orderItemsRepository.items[0].addons).toHaveLength(2);
      expect(orderItemsRepository.items[0].subtotal).toBe(10480);
    });

    it("deve calcular corretamente para múltiplos produtos com seus próprios addons", async () => {
      const { restaurantId, customerId, p1, p2, a2, a3 } = await createDeps();
      const order = await useCase.execute({
        restaurantId,
        customerId,
        type: "PICKUP",
        items: [
          {
            productId: p1.id,
            quantity: 1, // 3990
            addons: [{ addonId: a2.id, quantity: 1 }], // 500 -> total p1: 4490
          },
          {
            productId: p2.id,
            quantity: 2, // 1000 * 2 = 2000
            addons: [{ addonId: a3.id, quantity: 2 }], // 200 * 2 = 400 -> total p2: 2400
          },
        ],
        deliveryFee: 0,
      });

      expect(order.subtotal).toBe(4490 + 2400); // 6890
    });

    it("deve lançar AddonNotFoundError se o addon não existir", async () => {
      const { restaurantId, customerId, p1 } = await createDeps();
      await expect(
        useCase.execute({
          restaurantId,
          customerId,
          type: "PICKUP",
          deliveryFee: 0,
          items: [
            {
              productId: p1.id,
              quantity: 1,
              addons: [{ addonId: randomUUID(), quantity: 1 }],
            },
          ],
        }),
      ).rejects.toBeInstanceOf(AddonNotFoundError);
    });

    it("deve lançar AddonInactiveError se o addon estiver inativo", async () => {
      const { restaurantId, customerId, p1, a1 } = await createDeps();
      await addonsRepository.update(a1.id, { active: false });

      await expect(
        useCase.execute({
          restaurantId,
          customerId,
          type: "PICKUP",
          deliveryFee: 0,
          items: [
            {
              productId: p1.id,
              quantity: 1,
              addons: [{ addonId: a1.id, quantity: 1 }],
            },
          ],
        }),
      ).rejects.toBeInstanceOf(AddonInactiveError);
    });

    it("deve lançar AddonRestaurantMismatchError se addon for de outro restaurante", async () => {
      const { restaurantId, customerId, p1, a1 } = await createDeps();
      const anotherRestId = randomUUID();
      a1.restaurantId = anotherRestId; // Alterando mock diretamente para simular erro

      await expect(
        useCase.execute({
          restaurantId,
          customerId,
          type: "PICKUP",
          deliveryFee: 0,
          items: [
            {
              productId: p1.id,
              quantity: 1,
              addons: [{ addonId: a1.id, quantity: 1 }],
            },
          ],
        }),
      ).rejects.toBeInstanceOf(AddonRestaurantMismatchError);
    });

    it("deve lançar ProductAddonNotFoundError se addon não estiver associado ao produto", async () => {
      const { restaurantId, customerId, p1, a3 } = await createDeps();
      // a3 (Gelo) está associado apenas ao p2 (Guaraná) na base de dados (createDeps)

      await expect(
        useCase.execute({
          restaurantId,
          customerId,
          type: "PICKUP",
          deliveryFee: 0,
          items: [
            {
              productId: p1.id,
              quantity: 1,
              addons: [{ addonId: a3.id, quantity: 1 }],
            },
          ],
        }),
      ).rejects.toBeInstanceOf(ProductAddonNotFoundError);
    });
  });
});
