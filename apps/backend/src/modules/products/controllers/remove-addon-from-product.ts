import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleProductAddonsRepository } from "../repositories/drizzle-product-addons-repository.js";
import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { RemoveAddonFromProductUseCase } from "../use-cases/remove-addon-from-product.use-case.js";
import { productAddonParamsSchema } from "../schemas/product-addon.schema.js";

export async function removeAddonFromProductController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const params = productAddonParamsSchema.parse(request.params);

  const productAddonsRepository = new DrizzleProductAddonsRepository();
  const productsRepository = new DrizzleProductsRepository();

  const useCase = new RemoveAddonFromProductUseCase(
    productAddonsRepository,
    productsRepository,
  );

  await useCase.execute(params);

  return reply.status(204).send();
}
