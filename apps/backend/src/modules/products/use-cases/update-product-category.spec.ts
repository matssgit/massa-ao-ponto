import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { UpdateProductCategoryUseCase } from "./update-product-category.use-case.js";
import { randomUUID } from "node:crypto";

describe("UpdateProductCategoryUseCase", () => {
  let categoriesRepository: InMemoryProductCategoriesRepository;
  let useCase: UpdateProductCategoryUseCase;

  beforeEach(() => {
    categoriesRepository = new InMemoryProductCategoriesRepository();
    useCase = new UpdateProductCategoryUseCase(categoriesRepository);
  });

  it("deve atualizar parcialmente a categoria mantendo a integridade", async () => {
    const restaurantId = randomUUID();
    const category = await categoriesRepository.create({
      restaurantId,
      name: "Pizzas",
      displayOrder: 1,
    });

    const updated = await useCase.execute({
      restaurantId,
      categoryId: category.id,
      name: "Pizzas Especiais",
      displayOrder: 2,
    });
    expect(updated.name).toBe("Pizzas Especiais");
    expect(updated.displayOrder).toBe(2);
  });

  it("deve rejeitar se a categoria não existir", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        categoryId: randomUUID(),
        name: "Nova",
      }),
    ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);
  });

  it("deve rejeitar atualizar categoria de outro restaurante (isolamento)", async () => {
    const category = await categoriesRepository.create({
      restaurantId: randomUUID(),
      name: "Bebidas",
      displayOrder: 1,
    });
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        categoryId: category.id,
        name: "Nova Bebida",
      }),
    ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);

    expect(await categoriesRepository.findById(category.id)).toMatchObject({
      name: "Bebidas",
      displayOrder: 1,
    });
  });
});
