import { FastifyReply, FastifyRequest } from "fastify";

import { AddAddonToProductUseCase } from "../use-cases/add-addon-to-product.use-case.js";
import { DrizzleAddonsRepository } from "../repositories/drizzle-addons-repository.js";
import { DrizzleProductAddonsRepository } from "../repositories/drizzle-product-addons-repository.js";
import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { productAddonParamsSchema } from "../schemas/product-addon.schema.js";

export async function addAddonToProductController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const params = productAddonParamsSchema.parse(request.params);

  const productAddonsRepository = new DrizzleProductAddonsRepository();
  const productsRepository = new DrizzleProductsRepository();
  const addonsRepository = new DrizzleAddonsRepository();

  const useCase = new AddAddonToProductUseCase(
    productAddonsRepository,
    productsRepository,
    addonsRepository,
  );

  await useCase.execute(params);

  return reply.status(201).send();
}
