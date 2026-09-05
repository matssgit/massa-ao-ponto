import { beforeEach, describe, expect, it } from "vitest";

import { CreateProductCategoryUseCase } from "./create-product-category.use-case.js";
import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { randomUUID } from "node:crypto";

describe("CreateProductCategoryUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let productCategoriesRepository: InMemoryProductCategoriesRepository;
  let useCase: CreateProductCategoryUseCase;

  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    productCategoriesRepository = new InMemoryProductCategoriesRepository();
    useCase = new CreateProductCategoryUseCase(
      productCategoriesRepository,
      restaurantsRepository,
    );
  });

  it("deve criar uma categoria de produto com sucesso", async () => {
    const restaurantId = randomUUID();
    restaurantsRepository.items.push({
      id: restaurantId,
      name: "Pizzaria Teste",
      address: "Rua Teste",
      phone: "11999999999",
      timezone: "UTC",
      slug: null,
      publicEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await useCase.execute({
      restaurantId,
      name: "Pizzas",
      description: "Pizzas tradicionais",
      displayOrder: 1,
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("Pizzas");
    expect(result.displayOrder).toBe(1);
    expect(result.active).toBe(true);
  });

  it("deve lançar RestaurantNotFoundError se o restaurante não existir", async () => {
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        name: "Pizzas",
        displayOrder: 1,
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });
});
