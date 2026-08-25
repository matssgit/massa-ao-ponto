import { beforeEach, describe, expect, it } from "vitest";

import { DeleteProductCategoryUseCase } from "./delete-product-category.use-case.js";
import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { InMemoryProductsRepository } from "../repositories/in-memory-products-repository.js";
import { ProductCategoryHasProductsError } from "../errors/product-category-has-products-error.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ProductCategoryRestaurantMismatchError } from "../errors/product-category-restaurant-mismatch-error.js";
import { randomUUID } from "node:crypto";

describe("DeleteProductCategoryUseCase", () => {
  let categoriesRepository: InMemoryProductCategoriesRepository;
  let productsRepository: InMemoryProductsRepository;
  let useCase: DeleteProductCategoryUseCase;

  beforeEach(() => {
    categoriesRepository = new InMemoryProductCategoriesRepository();
    productsRepository = new InMemoryProductsRepository();
    useCase = new DeleteProductCategoryUseCase(
      categoriesRepository,
      productsRepository,
    );
  });

  it("deve excluir a categoria se ela não tiver produtos vinculados", async () => {
    const restaurantId = randomUUID();
    const category = await categoriesRepository.create({
      restaurantId,
      name: "Sucos",
      displayOrder: 1,
    });

    await useCase.execute({ restaurantId, categoryId: category.id });

    const found = await categoriesRepository.findById(category.id);
    expect(found).toBeNull();
  });

  it("deve rejeitar exclusão de categoria inexistente", async () => {
    await expect(
      useCase.execute({ restaurantId: randomUUID(), categoryId: randomUUID() }),
    ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);
  });

  it("deve rejeitar exclusão cross-tenant", async () => {
    const category = await categoriesRepository.create({
      restaurantId: randomUUID(),
      name: "Sucos",
      displayOrder: 1,
    });
    await expect(
      useCase.execute({ restaurantId: randomUUID(), categoryId: category.id }),
    ).rejects.toBeInstanceOf(ProductCategoryRestaurantMismatchError);
  });

  it("deve rejeitar exclusão se a categoria possuir produtos", async () => {
    const restaurantId = randomUUID();
    const category = await categoriesRepository.create({
      restaurantId,
      name: "Sucos",
      displayOrder: 1,
    });
    await productsRepository.create({
      restaurantId,
      categoryId: category.id,
      name: "Laranja",
      price: 1000,
      displayOrder: 1,
    });

    await expect(
      useCase.execute({ restaurantId, categoryId: category.id }),
    ).rejects.toBeInstanceOf(ProductCategoryHasProductsError);
  });
});
