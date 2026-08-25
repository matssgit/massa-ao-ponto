import { FastifyReply, FastifyRequest } from "fastify";
import {
  addonParamsSchema,
  updateAddonBodySchema,
} from "../schemas/addon.schema.js";

import { DrizzleAddonsRepository } from "../repositories/drizzle-addons-repository.js";
import { UpdateAddonUseCase } from "../use-cases/update-addon.use-case.js";

export async function updateAddonController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, addonId } = addonParamsSchema.parse(request.params);
  const data = updateAddonBodySchema.parse(request.body);

  const addonsRepository = new DrizzleAddonsRepository();
  const useCase = new UpdateAddonUseCase(addonsRepository);

  const addon = await useCase.execute({ restaurantId, addonId, ...data });

  return reply.status(200).send(addon);
}
