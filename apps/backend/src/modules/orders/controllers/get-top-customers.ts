import { FastifyReply, FastifyRequest } from "fastify";
import {
  getSalesSummaryParamsSchema,
  getTopCustomersQuerySchema,
} from "../schemas/dashboard.schema.js";

import { DrizzleOrdersAnalyticsRepository } from "../repositories/drizzle-orders-analytics-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { GetTopCustomersUseCase } from "../use-cases/get-top-customers.use-case.js";

export async function getTopCustomersController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = getSalesSummaryParamsSchema.parse(request.params);
  const { startsAt, endsAt, limit } = getTopCustomersQuerySchema.parse(
    request.query,
  );

  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const analyticsRepository = new DrizzleOrdersAnalyticsRepository();
  const useCase = new GetTopCustomersUseCase(
    restaurantsRepository,
    analyticsRepository,
  );

  const customers = await useCase.execute({
    restaurantId,
    startsAt,
    endsAt,
    limit,
  });

  return reply.status(200).send(customers);
}
