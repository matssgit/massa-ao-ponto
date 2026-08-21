import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryProductCategoriesRepository } from "../repositories/in-memory-product-categories-repository.js";
import { ListProductCategoriesUseCase } from "./list-product-categories.use-case.js";
import { randomUUID } from "node:crypto";

describe("ListProductCategoriesUseCase", () => {
  let productCategoriesRepository: InMemoryProductCategoriesRepository;
  let useCase: ListProductCategoriesUseCase;

  beforeEach(() => {
    productCategoriesRepository = new InMemoryProductCategoriesRepository();
    useCase = new ListProductCategoriesUseCase(productCategoriesRepository);
  });

  it("deve retornar as categorias de um restaurante respeitando o isolamento", async () => {
    const restaurant1 = randomUUID();
    const restaurant2 = randomUUID();

    await productCategoriesRepository.create({
      restaurantId: restaurant1,
      name: "Bebidas",
      displayOrder: 1,
    });
    await productCategoriesRepository.create({
      restaurantId: restaurant2,
      name: "Sobremesas",
      displayOrder: 1,
    });

    const result = await useCase.execute({ restaurantId: restaurant1 });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bebidas");
  });

  it("deve retornar as categorias ordenadas por displayOrder e id", async () => {
    const restaurantId = randomUUID();

    await productCategoriesRepository.create({
      restaurantId,
      name: "Bebidas",
      displayOrder: 2,
    });
    await productCategoriesRepository.create({
      restaurantId,
      name: "Sobremesas",
      displayOrder: 1,
    });

    const result = await useCase.execute({ restaurantId });

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Sobremesas");
    expect(result[1].name).toBe("Bebidas");
  });

  it("deve retornar array vazio se não houver categorias", async () => {
    const result = await useCase.execute({ restaurantId: randomUUID() });
    expect(result).toEqual([]);
  });
});
