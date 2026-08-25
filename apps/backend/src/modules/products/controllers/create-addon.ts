import { FastifyReply, FastifyRequest } from "fastify";
import {
  createAddonBodySchema,
  listAddonsParamsSchema,
} from "../schemas/addon.schema.js";

import { CreateAddonUseCase } from "../use-cases/create-addon.use-case.js";
import { DrizzleAddonsRepository } from "../repositories/drizzle-addons-repository.js";

export async function createAddonController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = listAddonsParamsSchema.parse(request.params);
  const data = createAddonBodySchema.parse(request.body);

  const addonsRepository = new DrizzleAddonsRepository();
  const useCase = new CreateAddonUseCase(addonsRepository);

  const addon = await useCase.execute({ restaurantId, ...data });

  return reply.status(201).send(addon);
}
