import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleRestaurantsRepository } from "../repositories/drizzle-restaurants-repository.js";
import { ListRestaurantsUseCase } from "../use-cases/list-restaurants.use-case.js";

export async function listRestaurantsController(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const repository = new DrizzleRestaurantsRepository();
  const useCase = new ListRestaurantsUseCase(repository);

  const restaurants = await useCase.execute();

  return reply.status(200).send(restaurants);
}
