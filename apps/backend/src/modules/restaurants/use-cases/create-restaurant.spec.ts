import { beforeEach, describe, expect, it } from "vitest";

import { CreateRestaurantUseCase } from "./create-restaurant.use-case.js";
import { InMemoryRestaurantsRepository } from "../repositories/in-memory-restaurants-repository.js";

let restaurantsRepository: InMemoryRestaurantsRepository;
let sut: CreateRestaurantUseCase; // sut = system under test

describe("Create Restaurant Use Case", () => {
  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    sut = new CreateRestaurantUseCase(restaurantsRepository);
  });

  it("should be able to create a restaurant", async () => {
    const restaurant = await sut.execute({
      name: "Massa ao Ponto",
      address: "Rua Principal, 123",
      phone: "11999999999",
      timezone: "America/Sao_Paulo",
    });

    expect(restaurant.id).toEqual(expect.any(String));
    expect(restaurant.name).toBe("Massa ao Ponto");
  });

  it("should persist the created restaurant in the repository", async () => {
    const restaurant = await sut.execute({
      name: "Pizzaria Dev",
      address: "Avenida Código, 404",
      phone: "11988888888",
      timezone: "America/Sao_Paulo",
    });

    // Validando o efeito colateral (persistência) no array em memória
    const persistedRestaurant = await restaurantsRepository.findById(
      restaurant.id,
    );

    expect(persistedRestaurant).toBeTruthy();
    expect(persistedRestaurant?.name).toBe("Pizzaria Dev");
    expect(persistedRestaurant?.address).toBe("Avenida Código, 404");
  });
});
