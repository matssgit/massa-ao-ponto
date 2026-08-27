import { beforeEach, describe, expect, it } from "vitest";

import { AddonNotFoundError } from "../errors/addon-not-found-error.js";
import { InMemoryAddonsRepository } from "../repositories/in-memory-addons-repository.js";
import { DeleteAddonUseCase } from "./delete-addon.use-case.js";
import { GetAddonUseCase } from "./get-addon.use-case.js";
import { ToggleAddonStatusUseCase } from "./toggle-addon-status.use-case.js";
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
    ).rejects.toBeInstanceOf(AddonNotFoundError);

    expect(await repository.findById(addon.id)).toMatchObject({ price: 200 });
  });
});

describe("GetAddonUseCase", () => {
  it("deve retornar o addon apenas para o restaurante proprietário", async () => {
    const repository = new InMemoryAddonsRepository();
    const useCase = new GetAddonUseCase(repository);
    const restaurantId = randomUUID();
    const addon = await repository.create({
      restaurantId,
      name: "Bacon",
      price: 200,
    });

    await expect(
      useCase.execute({ restaurantId, addonId: addon.id }),
    ).resolves.toMatchObject({ id: addon.id, restaurantId });

    await expect(
      useCase.execute({ restaurantId: randomUUID(), addonId: addon.id }),
    ).rejects.toBeInstanceOf(AddonNotFoundError);
  });
});

describe("ToggleAddonStatusUseCase", () => {
  it("deve ocultar e preservar o addon em tentativa cross-tenant", async () => {
    const repository = new InMemoryAddonsRepository();
    const useCase = new ToggleAddonStatusUseCase(repository);
    const addon = await repository.create({
      restaurantId: randomUUID(),
      name: "Bacon",
      price: 200,
    });

    await expect(
      useCase.execute({ restaurantId: randomUUID(), addonId: addon.id }),
    ).rejects.toBeInstanceOf(AddonNotFoundError);

    expect(await repository.findById(addon.id)).toMatchObject({ active: true });
  });
});

describe("DeleteAddonUseCase", () => {
  it("deve ocultar e preservar o addon em tentativa cross-tenant", async () => {
    const repository = new InMemoryAddonsRepository();
    const useCase = new DeleteAddonUseCase(repository);
    const addon = await repository.create({
      restaurantId: randomUUID(),
      name: "Bacon",
      price: 200,
    });

    await expect(
      useCase.execute({ restaurantId: randomUUID(), addonId: addon.id }),
    ).rejects.toBeInstanceOf(AddonNotFoundError);

    expect(await repository.findById(addon.id)).not.toBeNull();
  });
});
