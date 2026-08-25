import { FastifyReply, FastifyRequest } from "fastify";
import {
  listAddonsParamsSchema,
  listAddonsQuerySchema,
} from "../schemas/addon.schema.js";

import { DrizzleAddonsRepository } from "../repositories/drizzle-addons-repository.js";
import { ListAddonsUseCase } from "../use-cases/list-addons.use-case.js";

export async function listAddonsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = listAddonsParamsSchema.parse(request.params);
  const { active } = listAddonsQuerySchema.parse(request.query);

  const addonsRepository = new DrizzleAddonsRepository();
  const useCase = new ListAddonsUseCase(addonsRepository);

  const addons = await useCase.execute({ restaurantId, active });

  return reply.status(200).send(addons);
}
