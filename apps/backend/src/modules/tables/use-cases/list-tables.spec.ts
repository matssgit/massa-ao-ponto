import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryTablesRepository } from "../repositories/in-memory-tables-repository.js";
import { ListTablesUseCase } from "./list-tables.use-case.js";

let tablesRepository: InMemoryTablesRepository;
let sut: ListTablesUseCase;

describe("List Tables Use Case", () => {
  beforeEach(() => {
    tablesRepository = new InMemoryTablesRepository();
    sut = new ListTablesUseCase(tablesRepository);
  });

  it("should be able to list tables for a restaurant", async () => {
    await tablesRepository.create({
      restaurantId: "rest-1",
      number: "02",
      capacity: 4,
      type: "table",
    });
    await tablesRepository.create({
      restaurantId: "rest-1",
      number: "01",
      capacity: 2,
      type: "table",
    });
    await tablesRepository.create({
      restaurantId: "rest-2",
      number: "01",
      capacity: 2,
      type: "table",
    });

    const tables = await sut.execute({ restaurantId: "rest-1" });

    expect(tables).toHaveLength(2);
    expect(tables).toEqual([
      expect.objectContaining({ number: "01" }),
      expect.objectContaining({ number: "02" }),
    ]);
  });

  it("should return empty list when restaurant has no tables", async () => {
    const tables = await sut.execute({ restaurantId: "rest-3" });
    expect(tables).toHaveLength(0);
  });
});
