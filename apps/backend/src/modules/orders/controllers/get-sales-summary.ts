import { FastifyReply, FastifyRequest } from "fastify";
import {
  getSalesSummaryParamsSchema,
  getSalesSummaryQuerySchema,
} from "../schemas/dashboard.schema.js";

import { DrizzleOrdersAnalyticsRepository } from "../repositories/drizzle-orders-analytics-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { GetSalesSummaryUseCase } from "../use-cases/get-sales-summary.use-case.js";

export async function getSalesSummaryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = getSalesSummaryParamsSchema.parse(request.params);
  const { startsAt, endsAt } = getSalesSummaryQuerySchema.parse(request.query);

  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const analyticsRepository = new DrizzleOrdersAnalyticsRepository();
  const useCase = new GetSalesSummaryUseCase(
    restaurantsRepository,
    analyticsRepository,
  );

  const summary = await useCase.execute({
    restaurantId,
    startsAt,
    endsAt,
  });

  return reply.status(200).send(summary);
}
