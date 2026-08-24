import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryProductsRepository } from "../repositories/in-memory-products-repository.js";
import { ToggleProductStatusUseCase } from "./toggle-product-status.use-case.js";
import { randomUUID } from "node:crypto";

describe("ToggleProductStatusUseCase", () => {
  let productsRepository: InMemoryProductsRepository;
  let useCase: ToggleProductStatusUseCase;

  beforeEach(() => {
    productsRepository = new InMemoryProductsRepository();
    useCase = new ToggleProductStatusUseCase(productsRepository);
  });

  it("deve alternar corretamente o status do produto", async () => {
    const restaurantId = randomUUID();
    const product = await productsRepository.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Coca",
      description: "",
      price: 1000,
      displayOrder: 1,
    });

    expect(product.active).toBe(true);

    const toggled1 = await useCase.execute({
      restaurantId,
      productId: product.id,
    });
    expect(toggled1.active).toBe(false);

    const toggled2 = await useCase.execute({
      restaurantId,
      productId: product.id,
    });
    expect(toggled2.active).toBe(true);
  });
});
