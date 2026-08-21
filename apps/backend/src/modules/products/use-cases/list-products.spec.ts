import { beforeEach, describe, expect, it } from "vitest";

import { InMemoryProductsRepository } from "../repositories/in-memory-products-repository.js";
import { ListProductsUseCase } from "./list-products.use-case.js";
import { randomUUID } from "node:crypto";

describe("ListProductsUseCase", () => {
  let productsRepository: InMemoryProductsRepository;
  let useCase: ListProductsUseCase;

  beforeEach(() => {
    productsRepository = new InMemoryProductsRepository();
    useCase = new ListProductsUseCase(productsRepository);
  });

  it("deve listar todos os produtos do restaurante e respeitar o isolamento", async () => {
    const restaurant1 = randomUUID();
    const restaurant2 = randomUUID();
    const categoryId = randomUUID();

    await productsRepository.create({
      restaurantId: restaurant1,
      categoryId,
      name: "Prod A",
      price: 1000,
      displayOrder: 1,
    });
    await productsRepository.create({
      restaurantId: restaurant2,
      categoryId,
      name: "Prod B",
      price: 2000,
      displayOrder: 2,
    });

    const result = await useCase.execute({ restaurantId: restaurant1 });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Prod A");
  });

  it("deve filtrar produtos por categoryId", async () => {
    const restaurantId = randomUUID();
    const cat1 = randomUUID();
    const cat2 = randomUUID();

    await productsRepository.create({
      restaurantId,
      categoryId: cat1,
      name: "Pizzas",
      price: 1000,
      displayOrder: 1,
    });
    await productsRepository.create({
      restaurantId,
      categoryId: cat2,
      name: "Bebida",
      price: 500,
      displayOrder: 2,
    });

    const result = await useCase.execute({ restaurantId, categoryId: cat2 });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bebida");
  });

  it("deve filtrar produtos inativos caso active seja passado como false", async () => {
    const restaurantId = randomUUID();
    const categoryId = randomUUID();

    const p1 = await productsRepository.create({
      restaurantId,
      categoryId,
      name: "Ativo",
      price: 1000,
      displayOrder: 1,
    });
    const p2 = await productsRepository.create({
      restaurantId,
      categoryId,
      name: "Inativo",
      price: 2000,
      displayOrder: 2,
    });

    // Simulando inativação manual na memória
    const idx = productsRepository.items.findIndex((i) => i.id === p2.id);
    productsRepository.items[idx].active = false;

    const resultActive = await useCase.execute({ restaurantId, active: true });
    expect(resultActive).toHaveLength(1);
    expect(resultActive[0].name).toBe("Ativo");

    const resultInactive = await useCase.execute({
      restaurantId,
      active: false,
    });
    expect(resultInactive).toHaveLength(1);
    expect(resultInactive[0].name).toBe("Inativo");
  });
});
