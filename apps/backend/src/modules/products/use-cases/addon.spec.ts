import { beforeEach, describe, expect, it } from "vitest";

import { AddonRestaurantMismatchError } from "../errors/addon-restaurant-mismatch-error.js";
import { InMemoryAddonsRepository } from "../repositories/in-memory-addons-repository.js";
import { UpdateAddonUseCase } from "./update-addon.use-case.js";
import { randomUUID } from "node:crypto";

describe("UpdateAddonUseCase", () => {
  let repository: InMemoryAddonsRepository;
  let useCase: UpdateAddonUseCase;

  beforeEach(() => {
    repository = new InMemoryAddonsRepository();
    useCase = new UpdateAddonUseCase(repository);
  });

  it("deve atualizar o addon corretamente", async () => {
    const restaurantId = randomUUID();
    const addon = await repository.create({
      restaurantId,
      name: "Bacon",
      price: 200,
    });

    const result = await useCase.execute({
      restaurantId,
      addonId: addon.id,
      price: 300,
    });
    expect(result.price).toBe(300);
  });

  it("deve bloquear acesso cross-tenant", async () => {
    const addon = await repository.create({
      restaurantId: randomUUID(),
      name: "Bacon",
      price: 200,
    });
    await expect(
      useCase.execute({
        restaurantId: randomUUID(),
        addonId: addon.id,
        price: 300,
      }),
    ).rejects.toBeInstanceOf(AddonRestaurantMismatchError);
  });
});
