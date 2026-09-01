import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryRestaurantsRepository } from "../repositories/in-memory-restaurants-repository.js";
import { RestaurantNotFoundError } from "../errors/restaurant-not-found-error.js";
import { UpdateRestaurantUseCase } from "./update-restaurant.use-case.js";

describe("UpdateRestaurantUseCase", () => {
  let restaurantsRepository: InMemoryRestaurantsRepository;
  let useCase: UpdateRestaurantUseCase;

  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    useCase = new UpdateRestaurantUseCase(restaurantsRepository);
  });

  it("deve atualizar todos os campos administrativos", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Antigo",
      address: "Rua A",
      phone: "111",
      timezone: "UTC",
    });

    const result = await useCase.execute({
      restaurantId: restaurant.id,
      name: "Novo",
      address: "Rua B",
      phone: "222",
      timezone: "America/Sao_Paulo",
    });

    expect(result).toMatchObject({
      id: restaurant.id,
      name: "Novo",
      address: "Rua B",
      phone: "222",
      timezone: "America/Sao_Paulo",
    });
  });

  it("deve aplicar atualização parcial", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Original",
      address: "Rua A",
      phone: "111",
      timezone: "UTC",
    });

    const result = await useCase.execute({
      restaurantId: restaurant.id,
      name: "Atualizado",
    });

    expect(result).toMatchObject({
      name: "Atualizado",
      address: "Rua A",
      phone: "111",
      timezone: "UTC",
    });
  });

  it("deve rejeitar Restaurant inexistente", async () => {
    await expect(
      useCase.execute({
        restaurantId: "missing",
        name: "Novo",
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });
});

