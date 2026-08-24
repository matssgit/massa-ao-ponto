import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { ToggleProductStatusUseCase } from "../use-cases/toggle-product-status.use-case.js";
import { updateProductParamsSchema } from "../schemas/product.schema.js";

export async function toggleProductStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
) {

  const { restaurantId, productId } = updateProductParamsSchema.parse(
    request.params,
  );

  const productsRepository = new DrizzleProductsRepository();
  const useCase = new ToggleProductStatusUseCase(productsRepository);

  const result = await useCase.execute({ restaurantId, productId });

  return reply.status(200).send(result);
}
