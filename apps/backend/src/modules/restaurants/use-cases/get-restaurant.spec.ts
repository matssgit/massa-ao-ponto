import { beforeEach, describe, expect, it } from "vitest";

import { GetRestaurantUseCase } from "./get-restaurant.use-case.js";
import { InMemoryRestaurantsRepository } from "../repositories/in-memory-restaurants-repository.js";
import { RestaurantNotFoundError } from "../errors/restaurant-not-found-error.js";

let restaurantsRepository: InMemoryRestaurantsRepository;
let sut: GetRestaurantUseCase;

describe("Get Restaurant Use Case", () => {
  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    sut = new GetRestaurantUseCase(restaurantsRepository);
  });

  it("should be able to get a restaurant by id", async () => {
    const createdRestaurant = await restaurantsRepository.create({
      name: "Pizza Planet",
      address: "Rua do Teste, 123",
      phone: "11999999999",
      timezone: "America/Sao_Paulo",
    });

    const restaurant = await sut.execute({
      restaurantId: createdRestaurant.id,
    });

    expect(restaurant.id).toEqual(createdRestaurant.id);
    expect(restaurant.name).toEqual("Pizza Planet");
  });

  it("should not be able to get a non-existing restaurant", async () => {
    await expect(() =>
      sut.execute({ restaurantId: "non-existing-id" }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });
});
