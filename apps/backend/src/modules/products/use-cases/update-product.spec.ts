import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { InMemoryProductsRepository } from "../repositories/in-memory-products-repository.js";
import { ProductCategoryRestaurantMismatchError } from "../errors/product-category-restaurant-mismatch-error.js";
import { ProductNotFoundError } from "../errors/product-not-found-error.js";
import { UpdateProductUseCase } from "./update-product.use-case.js";
import { randomUUID } from "node:crypto";

describe("UpdateProductUseCase", () => {
  let productsRepository: InMemoryProductsRepository;
  let categoriesRepository: InMemoryProductCategoriesRepository;
  let useCase: UpdateProductUseCase;

  beforeEach(() => {
    productsRepository = new InMemoryProductsRepository();
    categoriesRepository = new InMemoryProductCategoriesRepository();
    useCase = new UpdateProductUseCase(
      productsRepository,
      categoriesRepository,
    );
  });

  it("deve atualizar os dados do produto mantendo a integridade", async () => {
    const restaurantId = randomUUID();
    const category = await categoriesRepository.create({
      restaurantId,
      name: "Bebidas",
      displayOrder: 1,
    });
    const product = await productsRepository.create({
      restaurantId,
      categoryId: category.id,
      name: "Coca",
      description: "",
      price: 1000,
      displayOrder: 1,
    });

    const updated = await useCase.execute({
      restaurantId,
      productId: product.id,
      name: "Coca Cola 2L",
      price: 1500,
    });

    expect(updated.name).toBe("Coca Cola 2L");
    expect(updated.price).toBe(1500);
    expect(updated.categoryId).toBe(category.id);
  });

  it("deve rejeitar atualizar produto de outro restaurante (isolamento)", async () => {
    const product = await productsRepository.create({
      restaurantId: randomUUID(),
      categoryId: randomUUID(),
      name: "Coca",
      description: "",
      price: 1000,
      displayOrder: 1,
    });
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        productId: product.id,
        price: 500,
      }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
  });

  it("deve rejeitar atribuir o produto a uma categoria de outro restaurante", async () => {
    const restaurantId = randomUUID();
    const cat1 = await categoriesRepository.create({
      restaurantId,
      name: "A",
      displayOrder: 1,
    });
    const cat2 = await categoriesRepository.create({
      restaurantId: randomUUID(),
      name: "B",
      displayOrder: 2,
    });

    const product = await productsRepository.create({
      restaurantId,
      categoryId: cat1.id,
      name: "Coca",
      description: "",
      price: 1000,
      displayOrder: 1,
    });

    await expect(
      useCase.execute({
        restaurantId,
        productId: product.id,
        categoryId: cat2.id,
      }),
    ).rejects.toBeInstanceOf(ProductCategoryRestaurantMismatchError);
  });
});
