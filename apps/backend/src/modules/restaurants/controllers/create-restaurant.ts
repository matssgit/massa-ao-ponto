import { FastifyReply, FastifyRequest } from "fastify";

import { CreateRestaurantUseCase } from "../use-cases/create-restaurant.use-case.js";
import { DrizzleRestaurantsRepository } from "../repositories/drizzle-restaurants-repository.js";
import { createRestaurantSchema } from "../schemas/restaurant.schema.js";

export async function createRestaurantController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // 1. Validação Zod (Se falhar, estoura um erro que o Error Handler captura)
  const body = createRestaurantSchema.parse(request.body);

  // 2. Injeção de Dependência Manual (Composition Root)
  const repository = new DrizzleRestaurantsRepository();
  const useCase = new CreateRestaurantUseCase(repository);

  // 3. Execução da Regra de Negócio
  const restaurant = await useCase.execute(body);

  // 4. Resposta HTTP 201 pura, sem envelopes inventados
  return reply.status(201).send(restaurant);
}
