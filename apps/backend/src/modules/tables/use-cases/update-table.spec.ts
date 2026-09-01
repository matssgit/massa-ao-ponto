import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryTablesRepository } from "../repositories/in-memory-tables-repository.js";
import { TableNotFoundError } from "../../reservations/errors/table-not-found-error.js";
import { TableNumberAlreadyExistsError } from "../errors/table-number-already-exists-error.js";
import { UpdateTableUseCase } from "./update-table.use-case.js";

describe("UpdateTableUseCase", () => {
  let tablesRepository: InMemoryTablesRepository;
  let useCase: UpdateTableUseCase;

  beforeEach(() => {
    tablesRepository = new InMemoryTablesRepository();
    useCase = new UpdateTableUseCase(tablesRepository);
  });

  it("deve atualizar todos os campos mutáveis", async () => {
    const table = await tablesRepository.create({
      restaurantId: "restaurant-1",
      number: "1",
      capacity: 4,
      type: "table",
    });

    const result = await useCase.execute({
      restaurantId: "restaurant-1",
      tableId: table.id,
      number: "2",
      capacity: 8,
      type: "room",
      active: false,
    });

    expect(result).toMatchObject({
      id: table.id,
      restaurantId: "restaurant-1",
      number: "2",
      capacity: 8,
      type: "room",
      active: false,
    });
  });

  it("deve aplicar atualização parcial sem alterar os demais campos", async () => {
    const table = await tablesRepository.create({
      restaurantId: "restaurant-1",
      number: "1",
      capacity: 4,
      type: "table",
    });

    const result = await useCase.execute({
      restaurantId: "restaurant-1",
      tableId: table.id,
      capacity: 6,
    });

    expect(result).toMatchObject({
      number: "1",
      capacity: 6,
      type: "table",
      active: true,
    });
  });

  it.each([
    { restaurantId: "restaurant-2", tableId: "existing" },
    { restaurantId: "restaurant-1", tableId: "missing" },
  ])("deve ocultar Table cross-tenant ou inexistente", async (request) => {
    const table = await tablesRepository.create({
      restaurantId: "restaurant-1",
      number: "1",
      capacity: 4,
      type: "table",
    });

    await expect(
      useCase.execute({
        restaurantId: request.restaurantId,
        tableId: request.tableId === "existing" ? table.id : request.tableId,
        active: false,
      }),
    ).rejects.toBeInstanceOf(TableNotFoundError);
    expect(table.active).toBe(true);
  });

  it("deve rejeitar número já usado no mesmo restaurante", async () => {
    const first = await tablesRepository.create({
      restaurantId: "restaurant-1",
      number: "1",
      capacity: 4,
      type: "table",
    });
    const second = await tablesRepository.create({
      restaurantId: "restaurant-1",
      number: "2",
      capacity: 4,
      type: "table",
    });

    await expect(
      useCase.execute({
        restaurantId: "restaurant-1",
        tableId: second.id,
        number: first.number,
      }),
    ).rejects.toBeInstanceOf(TableNumberAlreadyExistsError);
    expect(second.number).toBe("2");
  });

  it("deve permitir o mesmo número em outro restaurante", async () => {
    await tablesRepository.create({
      restaurantId: "restaurant-1",
      number: "1",
      capacity: 4,
      type: "table",
    });
    const secondTenantTable = await tablesRepository.create({
      restaurantId: "restaurant-2",
      number: "2",
      capacity: 4,
      type: "table",
    });

    const result = await useCase.execute({
      restaurantId: "restaurant-2",
      tableId: secondTenantTable.id,
      number: "1",
    });

    expect(result.number).toBe("1");
  });
});

