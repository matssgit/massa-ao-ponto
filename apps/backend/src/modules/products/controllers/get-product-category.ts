import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { GetProductCategoryUseCase } from "../use-cases/get-product-category.use-case.js";
import { getCategoryParamsSchema } from "../schemas/product-category.schema.js";

export async function getProductCategoryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, categoryId } = getCategoryParamsSchema.parse(
    request.params,
  );

  const categoriesRepository = new DrizzleProductCategoriesRepository();
  const useCase = new GetProductCategoryUseCase(categoriesRepository);

  const result = await useCase.execute({ restaurantId, categoryId });

  return reply.status(200).send(result);
}
