import { beforeEach, describe, expect, it } from "vitest";

import { AddAddonToProductUseCase } from "./add-addon-to-product.use-case.js";
import { InMemoryAddonsRepository } from "../repositories/in-memory-addons-repository.js";
import { InMemoryProductAddonsRepository } from "../repositories/in-memory-product-addons-repository.js";
import { InMemoryProductsRepository } from "../repositories/in-memory-products-repository.js";
import { ListProductAddonsUseCase } from "./list-product-addons.use-case.js";
import { ProductAddonAlreadyExistsError } from "../errors/product-addon-already-exists-error.js";
import { ProductAddonNotFoundError } from "../errors/product-addon-not-found-error.js";
import { RemoveAddonFromProductUseCase } from "./remove-addon-from-product.use-case.js";
import { randomUUID } from "node:crypto";

describe("Product Addons Use Cases", () => {
  let productsRepo: InMemoryProductsRepository;
  let addonsRepo: InMemoryAddonsRepository;
  let productAddonsRepo: InMemoryProductAddonsRepository;
  let addUseCase: AddAddonToProductUseCase;
  let removeUseCase: RemoveAddonFromProductUseCase;
  let listUseCase: ListProductAddonsUseCase;

  beforeEach(() => {
    productsRepo = new InMemoryProductsRepository();
    addonsRepo = new InMemoryAddonsRepository();
    productAddonsRepo = new InMemoryProductAddonsRepository(addonsRepo);

    addUseCase = new AddAddonToProductUseCase(
      productAddonsRepo,
      productsRepo,
      addonsRepo,
    );
    removeUseCase = new RemoveAddonFromProductUseCase(
      productAddonsRepo,
      productsRepo,
    );
    listUseCase = new ListProductAddonsUseCase(productAddonsRepo, productsRepo);
  });

  it("deve associar um addon a um produto, listar e remover com sucesso", async () => {
    const restaurantId = randomUUID();
    const product = await productsRepo.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Pizza",
      price: 5000,
      displayOrder: 0,
    });
    const addon = await addonsRepo.create({
      restaurantId,
      name: "Bacon",
      price: 500,
    });

    await addUseCase.execute({
      restaurantId,
      productId: product.id,
      addonId: addon.id,
    });

    let list = await listUseCase.execute({
      restaurantId,
      productId: product.id,
    });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(addon.id);

    await removeUseCase.execute({
      restaurantId,
      productId: product.id,
      addonId: addon.id,
    });

    list = await listUseCase.execute({ restaurantId, productId: product.id });
    expect(list).toHaveLength(0);
  });

  it("deve bloquear associacoes duplicadas", async () => {
    const restaurantId = randomUUID();
    const product = await productsRepo.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Pizza",
      price: 5000,
      displayOrder: 0,
    });
    const addon = await addonsRepo.create({
      restaurantId,
      name: "Bacon",
      price: 500,
    });

    await addUseCase.execute({
      restaurantId,
      productId: product.id,
      addonId: addon.id,
    });
    await expect(
      addUseCase.execute({
        restaurantId,
        productId: product.id,
        addonId: addon.id,
      }),
    ).rejects.toBeInstanceOf(ProductAddonAlreadyExistsError);
  });

  it("deve rejeitar remocao de associacao inexistente", async () => {
    const restaurantId = randomUUID();
    const product = await productsRepo.create({
      restaurantId,
      categoryId: randomUUID(),
      name: "Pizza",
      price: 5000,
      displayOrder: 0,
    });

    await expect(
      removeUseCase.execute({
        restaurantId,
        productId: product.id,
        addonId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(ProductAddonNotFoundError);
  });
});
