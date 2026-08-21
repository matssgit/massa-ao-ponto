import { FastifyReply, FastifyRequest } from "fastify";
import {
  listProductsQuerySchema,
  productParamsSchema,
} from "../schemas/product.schema.js";

import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { ListProductsUseCase } from "../use-cases/list-products.use-case.js";

export async function listProductsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = productParamsSchema.parse(request.params);
  const { categoryId, active } = listProductsQuerySchema.parse(request.query);

  const productsRepository = new DrizzleProductsRepository();
  const useCase = new ListProductsUseCase(productsRepository);

  const products = await useCase.execute({
    restaurantId,
    categoryId,
    active,
  });

  return reply.status(200).send(products);
}
