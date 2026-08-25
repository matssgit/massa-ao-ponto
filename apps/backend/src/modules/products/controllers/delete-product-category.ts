import { FastifyReply, FastifyRequest } from "fastify";

import { DeleteProductCategoryUseCase } from '../use-cases/delete-product-category.use-case.js';
import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { deleteCategoryParamsSchema } from "../schemas/product-category.schema.js";

export async function deleteProductCategoryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, categoryId } = deleteCategoryParamsSchema.parse(
    request.params,
  );

  const categoriesRepository = new DrizzleProductCategoriesRepository();
  const productsRepository = new DrizzleProductsRepository();
  const useCase = new DeleteProductCategoryUseCase(
    categoriesRepository,
    productsRepository,
  );

  await useCase.execute({ restaurantId, categoryId });

  return reply.status(204).send();
}