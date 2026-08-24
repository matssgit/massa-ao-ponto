import { FastifyReply, FastifyRequest } from "fastify";
import {
  getSalesSummaryParamsSchema,
  getTopProductsQuerySchema,
} from "../schemas/dashboard.schema.js";

import { DrizzleOrdersAnalyticsRepository } from "../repositories/drizzle-orders-analytics-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { GetTopProductsUseCase } from "../use-cases/get-top-products.use-case.js";

export async function getTopProductsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = getSalesSummaryParamsSchema.parse(request.params);
  const { startsAt, endsAt, limit } = getTopProductsQuerySchema.parse(
    request.query,
  );

  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const analyticsRepository = new DrizzleOrdersAnalyticsRepository();
  const useCase = new GetTopProductsUseCase(
    restaurantsRepository,
    analyticsRepository,
  );

  const products = await useCase.execute({
    restaurantId,
    startsAt,
    endsAt,
    limit,
  });

  return reply.status(200).send(products);
}
