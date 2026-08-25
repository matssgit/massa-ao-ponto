import { FastifyReply, FastifyRequest } from "fastify";

import { DeleteAddonUseCase } from "../use-cases/delete-addon.use-case.js";
import { DrizzleAddonsRepository } from "../repositories/drizzle-addons-repository.js";
import { addonParamsSchema } from "../schemas/addon.schema.js";

export async function deleteAddonController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, addonId } = addonParamsSchema.parse(request.params);

  const addonsRepository = new DrizzleAddonsRepository();
  const useCase = new DeleteAddonUseCase(addonsRepository);

  await useCase.execute({ restaurantId, addonId });

  return reply.status(204).send();
}
