import { FastifyReply, FastifyRequest } from "fastify";
import {
  updateCategoryBodySchema,
  updateCategoryParamsSchema,
} from "../schemas/product-category.schema.js";

import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { UpdateProductCategoryUseCase } from "../use-cases/update-product-category.use-case.js";

export async function updateProductCategoryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, categoryId } = updateCategoryParamsSchema.parse(
    request.params,
  );
  const data = updateCategoryBodySchema.parse(request.body);

  const categoriesRepository = new DrizzleProductCategoriesRepository();
  const useCase = new UpdateProductCategoryUseCase(categoriesRepository);

  const result = await useCase.execute({ restaurantId, categoryId, ...data });

  return reply.status(200).send(result);
}
