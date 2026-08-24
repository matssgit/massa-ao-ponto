import { FastifyReply, FastifyRequest } from "fastify";
import {
  getCategoryPerformanceQuerySchema,
  getSalesSummaryParamsSchema,
} from "../schemas/dashboard.schema.js";

import { DrizzleOrdersAnalyticsRepository } from "../repositories/drizzle-orders-analytics-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { GetCategoryPerformanceUseCase } from "../use-cases/get-category-performance.use-case.js";

export async function getCategoryPerformanceController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = getSalesSummaryParamsSchema.parse(request.params);
  const { startsAt, endsAt, limit } = getCategoryPerformanceQuerySchema.parse(
    request.query,
  );

  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const analyticsRepository = new DrizzleOrdersAnalyticsRepository();
  const useCase = new GetCategoryPerformanceUseCase(
    restaurantsRepository,
    analyticsRepository,
  );

  const performance = await useCase.execute({
    restaurantId,
    startsAt,
    endsAt,
    limit,
  });

  return reply.status(200).send(performance);
}
