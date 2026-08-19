import { beforeEach, describe, expect, it } from "vitest";

import { CreateTableUseCase } from "./create-table.use-case.js";
import { InMemoryRestaurantsRepository } from "../../restaurants/repositories/in-memory-restaurants-repository.js";
import { InMemoryTablesRepository } from "../repositories/in-memory-tables-repository.js";
import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { TableNumberAlreadyExistsError } from "../errors/table-number-already-exists-error.js";

let tablesRepository: InMemoryTablesRepository;
let restaurantsRepository: InMemoryRestaurantsRepository;
let sut: CreateTableUseCase;

describe("Create Table Use Case", () => {
  beforeEach(() => {
    tablesRepository = new InMemoryTablesRepository();
    restaurantsRepository = new InMemoryRestaurantsRepository();
    sut = new CreateTableUseCase(tablesRepository, restaurantsRepository);
  });

  it("should be able to create a table", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Pizza Planet",
      address: "Rua 1",
      phone: "11999",
      timezone: "UTC",
    });

    const table = await sut.execute({
      restaurantId: restaurant.id,
      number: "Mesa 01",
      capacity: 4,
      type: "table",
    });

    expect(table.id).toEqual(expect.any(String));
    expect(table.active).toBe(true);
  });

  it("should not be able to create a table for a non-existing restaurant", async () => {
    await expect(() =>
      sut.execute({
        restaurantId: "invalid-id",
        number: "Mesa 01",
        capacity: 4,
        type: "table",
      }),
    ).rejects.toBeInstanceOf(RestaurantNotFoundError);
  });

  it("should not be able to create a table with a duplicated number in the same restaurant", async () => {
    const restaurant = await restaurantsRepository.create({
      name: "Pizza Planet",
      address: "Rua 1",
      phone: "11999",
      timezone: "UTC",
    });

    await sut.execute({
      restaurantId: restaurant.id,
      number: "12",
      capacity: 4,
      type: "table",
    });

    await expect(() =>
      sut.execute({
        restaurantId: restaurant.id,
        number: "12",
        capacity: 2,
        type: "room",
      }),
    ).rejects.toBeInstanceOf(TableNumberAlreadyExistsError);
  });
});
