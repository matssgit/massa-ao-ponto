import { FastifyReply, FastifyRequest } from "fastify";
import {
  createProductCategoryBodySchema,
  productCategoryParamsSchema,
} from "../schemas/product-category.schema.js";

import { CreateProductCategoryUseCase } from "../use-cases/create-product-category.use-case.js";
import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";

export async function createProductCategoryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = productCategoryParamsSchema.parse(request.params);
  const body = createProductCategoryBodySchema.parse(request.body);

  const productCategoriesRepository = new DrizzleProductCategoriesRepository();
  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const useCase = new CreateProductCategoryUseCase(
    productCategoriesRepository,
    restaurantsRepository,
  );

  const category = await useCase.execute({
    restaurantId,
    ...body,
  });

  return reply.status(201).send(category);
}
