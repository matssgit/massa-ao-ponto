import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleAddonsRepository } from "../repositories/drizzle-addons-repository.js";
import { GetAddonUseCase } from "../use-cases/get-addon.use-case.js";
import { getAddonParamsSchema } from "../schemas/addon.schema.js";

export async function getAddonController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, addonId } = getAddonParamsSchema.parse(request.params);

  const addonsRepository = new DrizzleAddonsRepository();
  const useCase = new GetAddonUseCase(addonsRepository);

  const addon = await useCase.execute({ restaurantId, addonId });

  return reply.status(200).send(addon);
}
