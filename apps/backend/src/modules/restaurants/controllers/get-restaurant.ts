import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleRestaurantsRepository } from "../repositories/drizzle-restaurants-repository.js";
import { GetRestaurantUseCase } from "../use-cases/get-restaurant.use-case.js";
import { z } from "zod";

const getRestaurantParamsSchema = z.object({
  restaurantId: z.string().uuid("Invalid restaurant ID format."),
});

export async function getRestaurantController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = getRestaurantParamsSchema.parse(request.params);

  const repository = new DrizzleRestaurantsRepository();
  const useCase = new GetRestaurantUseCase(repository);

  const restaurant = await useCase.execute({ restaurantId });

  return reply.status(200).send(restaurant);
}
