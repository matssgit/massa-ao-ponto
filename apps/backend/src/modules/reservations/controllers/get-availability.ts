import { FastifyReply, FastifyRequest } from "fastify";
import {
  getAvailabilityParamsSchema,
  getAvailabilityQuerySchema,
} from "../schemas/availability.schema.js";

import { DrizzleReservationsRepository } from "../repositories/drizzle-reservations-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { DrizzleTablesRepository } from "../../tables/repositories/drizzle-tables-repository.js";
import { GetAvailabilityUseCase } from "../use-cases/get-availability.use-case.js";

export async function getAvailabilityController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = getAvailabilityParamsSchema.parse(request.params);
  const query = getAvailabilityQuerySchema.parse(request.query);

  const useCase = new GetAvailabilityUseCase(
    new DrizzleRestaurantsRepository(),
    new DrizzleTablesRepository(),
    new DrizzleReservationsRepository(),
  );

  const availableTables = await useCase.execute({
    restaurantId,
    startsAt: query.startsAt,
    endsAt: query.endsAt,
    people: query.people,
  });

  return reply.status(200).send(availableTables);
}
