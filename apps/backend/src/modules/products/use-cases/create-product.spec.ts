import { beforeEach, describe, expect, it } from "vitest";

import { CreateProductUseCase } from "./create-product.use-case.js";
import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { InMemoryProductsRepository } from "../repositories/in-memory-products-repository.js";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { ProductCategoryNotFoundError } from "../errors/product-category-not-found-error.js";
import { ProductCategoryRestaurantMismatchError } from "../errors/product-category-restaurant-mismatch-error.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("CreateProductUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let productCategoriesRepository: InMemoryProductCategoriesRepository;
  let productsRepository: InMemoryProductsRepository;
  let useCase: CreateProductUseCase;

  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    productCategoriesRepository = new InMemoryProductCategoriesRepository();
    productsRepository = new InMemoryProductsRepository();
    useCase = new CreateProductUseCase(
      productsRepository,
      productCategoriesRepository,
      restaurantsRepository,
    );
  });

  async function createDeps() {
    const restaurantId = randomUUID();
    restaurantsRepository.items.push({
      id: restaurantId,
      name: "Pizzaria",
      address: "Rua",
      phone: "11",
      timezone: "UTC",
      slug: null,
      publicEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const category = await productCategoriesRepository.create({
      restaurantId,
      name: "Pizzas",
      displayOrder: 1,
    });

    return { restaurantId, categoryId: category.id };
  }

  it("deve criar um produto com sucesso guardando o valor em centavos", async () => {
    const { restaurantId, categoryId } = await createDeps();

    const result = await useCase.execute({
      restaurantId,
      categoryId,
      name: "Pizza Calabresa",
      price: 3990,
      displayOrder: 1,
    });

    expect(result.id).toBeDefined();
    expect(result.price).toBe(3990);
  });

  it("deve lançar RestaurantNotFoundError se o restaurante não existir", async () => {
    const categoryId = randomUUID();
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        categoryId,
        name: "Pizza",
        price: 1000,
        displayOrder: 1,
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });

  it("deve lançar ProductCategoryNotFoundError se a categoria não existir", async () => {
    const { restaurantId } = await createDeps();
    await expect(
      useCase.execute({
        restaurantId,
        categoryId: randomUUID(),
        name: "Pizza",
        price: 1000,
        displayOrder: 1,
      }),
    ).rejects.toBeInstanceOf(ProductCategoryNotFoundError);
  });

  it("deve lançar ProductCategoryRestaurantMismatchError se a categoria for de outro restaurante", async () => {
    const { restaurantId } = await createDeps();

    // Outro restaurante e outra categoria
    const otherRestaurantId = randomUUID();
    restaurantsRepository.items.push({
      id: otherRestaurantId,
      name: "B",
      address: "B",
      phone: "1",
      timezone: "UTC",
      slug: null,
      publicEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const otherCategory = await productCategoriesRepository.create({
      restaurantId: otherRestaurantId,
      name: "Bebidas",
      displayOrder: 1,
    });

    await expect(
      useCase.execute({
        restaurantId,
        categoryId: otherCategory.id,
        name: "Pizza",
        price: 1000,
        displayOrder: 1,
      }),
    ).rejects.toBeInstanceOf(ProductCategoryRestaurantMismatchError);
  });
});
