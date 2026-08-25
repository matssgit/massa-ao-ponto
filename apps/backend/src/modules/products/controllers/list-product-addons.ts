import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleProductAddonsRepository } from "../repositories/drizzle-product-addons-repository.js";
import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { ListProductAddonsUseCase } from "../use-cases/list-product-addons.use-case.js";
import { listProductAddonsParamsSchema } from "../schemas/product-addon.schema.js";

export async function listProductAddonsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const params = listProductAddonsParamsSchema.parse(request.params);

  const productAddonsRepository = new DrizzleProductAddonsRepository();
  const productsRepository = new DrizzleProductsRepository();

  const useCase = new ListProductAddonsUseCase(
    productAddonsRepository,
    productsRepository,
  );

  const addons = await useCase.execute(params);

  return reply.status(200).send(addons);
}
