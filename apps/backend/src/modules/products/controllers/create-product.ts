import { FastifyReply, FastifyRequest } from "fastify";
import {
  createProductBodySchema,
  productParamsSchema,
} from "../schemas/product.schema.js";

import { CreateProductUseCase } from "../use-cases/create-product.use-case.js";
import { DrizzleProductCategoriesRepository } from "../repositories/drizzle-product-categories-repository.js";
import { DrizzleProductsRepository } from "../repositories/drizzle-products-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";

export async function createProductController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = productParamsSchema.parse(request.params);
  const body = createProductBodySchema.parse(request.body);

  const productsRepository = new DrizzleProductsRepository();
  const productCategoriesRepository = new DrizzleProductCategoriesRepository();
  const restaurantsRepository = new DrizzleRestaurantsRepository();

  const useCase = new CreateProductUseCase(
    productsRepository,
    productCategoriesRepository,
    restaurantsRepository,
  );

  const product = await useCase.execute({
    restaurantId,
    ...body,
  });

  return reply.status(201).send(product);
}
