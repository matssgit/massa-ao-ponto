import { beforeEach, describe, expect, it } from "vitest";

import { DeleteProductUseCase } from "./delete-product.use-case.js";
import { InMemoryOrderItemsRepository } from "../../orders/repositories/in-memory-order-items-repository.js";
import { InMemoryProductsRepository } from "../repositories/in-memory-products-repository.js";
import { ProductHasOrdersError } from "../errors/product-has-orders-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("DeleteProductUseCase", () => {
  let productsRepository: InMemoryProductsRepository;
  let orderItemsRepository: InMemoryOrderItemsRepository;
  let useCase: DeleteProductUseCase;

  beforeEach(() => {
    productsRepository = new InMemoryProductsRepository();
    orderItemsRepository = new InMemoryOrderItemsRepository();
    useCase = new DeleteProductUseCase(
      productsRepository,
      orderItemsRepository,
    );
  });

  it("deve excluir o produto se ele não tiver sido registrado em pedidos", async () => {
    const restaurantId = randomUUID();
    const product = await productsRepository.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Bolo",
      price: 2000,
      displayOrder: 1,
    });

    await useCase.execute({ restaurantId, productId: product.id });

    const found = await productsRepository.findById(product.id);
    expect(found).toBeNull();
  });

  it("deve rejeitar exclusão de produto inexistente ou cross-tenant", async () => {
    const product = await productsRepository.create({
      restaurantId: randomUUID(),
      categoryId: randomUUID(),
      name: "Bolo",
      price: 2000,
      displayOrder: 1,
    });
    await expect(
      useCase.execute({ restaurantId: randomUUID(), productId: product.id }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("deve rejeitar exclusão de produto com histórico de pedidos", async () => {
    const restaurantId = randomUUID();
    const product = await productsRepository.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Bolo",
      price: 2000,
      displayOrder: 1,
    });

    orderItemsRepository.items.push({
      id: randomUUID(),
      orderId: randomUUID(),
      productId: product.id,
      productName: product.name,
      unitPrice: product.price,
      quantity: 1,
      subtotal: product.price,
      createdAt: new Date(),
    });

    await expect(
      useCase.execute({ restaurantId, productId: product.id }),
    ).rejects.toBeInstanceOf(ProductHasOrdersError);
  });
});
