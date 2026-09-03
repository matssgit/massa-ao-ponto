import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleAuthRepository } from "../../auth/repositories/drizzle-auth-repository.js";
import { UnauthenticatedError } from "../../auth/errors/auth-errors.js";
import { ListRestaurantsUseCase } from "../use-cases/list-restaurants.use-case.js";

export async function listRestaurantsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (!request.authenticatedUserId) throw new UnauthenticatedError();
  const repository = new DrizzleAuthRepository();
  const useCase = new ListRestaurantsUseCase(repository);

  const restaurants = await useCase.execute(request.authenticatedUserId);

  return reply.status(200).send(restaurants);
}
