import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleAddonsRepository } from "../repositories/drizzle-addons-repository.js";
import { ToggleAddonStatusUseCase } from "../use-cases/toggle-addon-status.use-case.js";
import { addonParamsSchema } from "../schemas/addon.schema.js";

export async function toggleAddonStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, addonId } = addonParamsSchema.parse(request.params);

  const addonsRepository = new DrizzleAddonsRepository();
  const useCase = new ToggleAddonStatusUseCase(addonsRepository);

  const addon = await useCase.execute({ restaurantId, addonId });

  return reply.status(200).send(addon);
}
