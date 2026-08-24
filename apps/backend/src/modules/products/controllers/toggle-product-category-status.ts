import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { ToggleProductCategoryStatusUseCase } from "../use-cases/toggle-product-category-status.use-case.js";
import { updateCategoryParamsSchema } from "../schemas/product-category.schema.js";

export async function toggleProductCategoryStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, categoryId } = updateCategoryParamsSchema.parse(
    request.params,
  );

  const categoriesRepository = new DrizzleProductCategoriesRepository();
  const useCase = new ToggleProductCategoryStatusUseCase(categoriesRepository);

  const result = await useCase.execute({ restaurantId, categoryId });

  return reply.status(200).send(result);
}
