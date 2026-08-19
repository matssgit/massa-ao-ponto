import { FastifyReply, FastifyRequest } from "fastify";

import { CreateRestaurantUseCase } from "../use-cases/create-restaurant.use-case.js";
import { DrizzleRestaurantsRepository } from "../repositories/drizzle-restaurants-repository.js";
import { createRestaurantSchema } from "../schemas/restaurant.schema.js";

export async function createRestaurantController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createRestaurantSchema.parse(request.body);

  const repository = new DrizzleRestaurantsRepository();
  const useCase = new CreateRestaurantUseCase(repository);

  const restaurant = await useCase.execute(body);

  return reply.status(201).send(restaurant);
}
