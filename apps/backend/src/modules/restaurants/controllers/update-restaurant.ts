import { FastifyReply, FastifyRequest } from "fastify";
import {
  updateRestaurantBodySchema,
  updateRestaurantParamsSchema,
} from "../schemas/restaurant.schema.js";

import { DrizzleRestaurantsRepository } from "../repositories/drizzle-restaurants-repository.js";
import { UpdateRestaurantUseCase } from "../use-cases/update-restaurant.use-case.js";

export async function updateRestaurantController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = updateRestaurantParamsSchema.parse(request.params);
  const data = updateRestaurantBodySchema.parse(request.body);
  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const useCase = new UpdateRestaurantUseCase(restaurantsRepository);

  const restaurant = await useCase.execute({ restaurantId, ...data });

  return reply.status(200).send(restaurant);
}
