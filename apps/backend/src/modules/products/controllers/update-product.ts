import { FastifyReply, FastifyRequest } from "fastify";
import {
  updateProductBodySchema,
  updateProductParamsSchema,
} from "../schemas/product.schema.js";

import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { UpdateProductUseCase } from "../use-cases/update-product.use-case.js";

export async function updateProductController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, productId } = updateProductParamsSchema.parse(
    request.params,
  );
  const data = updateProductBodySchema.parse(request.body);

  const productsRepository = new DrizzleProductsRepository();
  const categoriesRepository = new DrizzleProductCategoriesRepository();
  const useCase = new UpdateProductUseCase(
    productsRepository,
    categoriesRepository,
  );

  const result = await useCase.execute({ restaurantId, productId, ...data });

  return reply.status(200).send(result);
}
