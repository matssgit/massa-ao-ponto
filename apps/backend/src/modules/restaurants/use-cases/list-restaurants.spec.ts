import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryRestaurantsRepository } from "../repositories/in-memory-restaurants-repository.js";
import { ListRestaurantsUseCase } from "./list-restaurants.use-case.js";

let restaurantsRepository: InMemoryRestaurantsRepository;
let sut: ListRestaurantsUseCase;

describe("List Restaurants Use Case", () => {
  beforeEach(() => {
    restaurantsRepository = new InMemoryRestaurantsRepository();
    sut = new ListRestaurantsUseCase(restaurantsRepository);
  });

  it("should be able to list restaurants", async () => {
    await restaurantsRepository.create({
      name: "Pizza Planet",
      address: "Rua do Teste, 123",
      phone: "11999999999",
      timezone: "America/Sao_Paulo",
    });

    await restaurantsRepository.create({
      name: "Massa ao Ponto",
      address: "Avenida Principal, 456",
      phone: "11888888888",
      timezone: "America/Sao_Paulo",
    });

    const restaurants = await sut.execute();

    expect(restaurants).toHaveLength(2);
    expect(restaurants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Pizza Planet" }),
        expect.objectContaining({ name: "Massa ao Ponto" }),
      ]),
    );
  });

  it("should return an empty list when there are no restaurants", async () => {
    const restaurants = await sut.execute();
    expect(restaurants).toHaveLength(0);
  });
});
