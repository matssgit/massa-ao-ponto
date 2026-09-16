import type { FastifyReply, FastifyRequest } from "fastify";
import { DrizzleOperatingHoursRepository } from "../repositories/drizzle-operating-hours-repository.js";
import { DrizzleRestaurantsRepository } from "../repositories/drizzle-restaurants-repository.js";
import { operatingHoursParamsSchema, updateOperatingHoursBodySchema } from "../schemas/operating-hours.schema.js";
import { GetOperatingHoursUseCase, UpdateOperatingHoursUseCase } from "../use-cases/manage-operating-hours.use-case.js";

export async function getOperatingHoursController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = operatingHoursParamsSchema.parse(request.params);
  const result = await new GetOperatingHoursUseCase(new DrizzleRestaurantsRepository(), new DrizzleOperatingHoursRepository()).execute(restaurantId);
  return reply.status(200).send(result);
}

export async function updateOperatingHoursController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = operatingHoursParamsSchema.parse(request.params);
  const { days } = updateOperatingHoursBodySchema.parse(request.body);
  const result = await new UpdateOperatingHoursUseCase(new DrizzleRestaurantsRepository(), new DrizzleOperatingHoursRepository()).execute(restaurantId, days);
  return reply.status(200).send(result);
}
