import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { ListProductCategoriesUseCase } from "../use-cases/list-product-categories.use-case.js";
import { productCategoryParamsSchema } from "../schemas/product-category.schema.js";

export async function listProductCategoriesController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = productCategoryParamsSchema.parse(request.params);

  const productCategoriesRepository = new DrizzleProductCategoriesRepository();
  const useCase = new ListProductCategoriesUseCase(productCategoriesRepository);

  const categories = await useCase.execute({ restaurantId });

  return reply.status(200).send(categories);
}
