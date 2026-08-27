import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ToggleProductCategoryStatusUseCase } from "./toggle-product-category-status.use-case.js";
import { randomUUID } from "node:crypto";

describe("ToggleProductCategoryStatusUseCase", () => {
  let categoriesRepository: InMemoryProductCategoriesRepository;
  let useCase: ToggleProductCategoryStatusUseCase;

  beforeEach(() => {
    categoriesRepository = new InMemoryProductCategoriesRepository();
    useCase = new ToggleProductCategoryStatusUseCase(categoriesRepository);
  });

  it("deve inativar e reativar a categoria corretamente", async () => {
    const restaurantId = randomUUID();
    const category = await categoriesRepository.create({
      restaurantId,
      name: "Doces",
      displayOrder: 1,
    });

    const toggled1 = await useCase.execute({
      restaurantId,
      categoryId: category.id,
    });
    expect(toggled1.active).toBe(false);

    const toggled2 = await useCase.execute({
      restaurantId,
      categoryId: category.id,
    });
    expect(toggled2.active).toBe(true);
  });

  it("deve proteger o toggle contra tentativas de acesso cross-tenant", async () => {
    const category = await categoriesRepository.create({
      restaurantId: randomUUID(),
      name: "Doces",
      displayOrder: 1,
    });
    await expect(
      useCase.execute({ restaurantId: randomUUID(), categoryId: category.id }),
    ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);

    expect(await categoriesRepository.findById(category.id)).toMatchObject({
      active: true,
    });
  });
});
