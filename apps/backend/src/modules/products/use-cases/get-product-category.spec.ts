import { beforeEach, describe, expect, it } from "vitest";

import { GetProductCategoryUseCase } from "./get-product-category.use-case.js";
import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("GetProductCategoryUseCase", () => {
  let categoriesRepository: InMemoryProductCategoriesRepository;
  let useCase: GetProductCategoryUseCase;

  beforeEach(() => {
    categoriesRepository = new InMemoryProductCategoriesRepository();
    useCase = new GetProductCategoryUseCase(categoriesRepository);
  });

  it("deve retornar a categoria corretamente", async () => {
    const restaurantId = randomUUID();
    const created = await categoriesRepository.create({
      restaurantId,
      name: "Bebidas",
      displayOrder: 1,
    });
    const category = await useCase.execute({
      restaurantId,
      categoryId: created.id,
    });
    expect(category.id).toBe(created.id);
    expect(category.name).toBe("Bebidas");
  });

  it("deve rejeitar se a categoria não existir", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        categoryId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);
  });

  it("deve ocultar categoria de outro restaurante", async () => {
    const created = await categoriesRepository.create({
      restaurantId: randomUUID(),
      name: "Bebidas",
      displayOrder: 1,
    });

    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        categoryId: created.id,
      }),
    ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);
  });
});
