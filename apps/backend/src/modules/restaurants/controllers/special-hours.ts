import type { FastifyReply, FastifyRequest } from "fastify";
import { DrizzleRestaurantsRepository } from "../repositories/drizzle-restaurants-repository.js";
import { DrizzleSpecialHoursRepository } from "../repositories/drizzle-special-hours-repository.js";
import { specialHourBodySchema, specialHourParamsSchema, specialHoursParamsSchema } from "../schemas/special-hours.schema.js";
import { CreateSpecialHourUseCase, DeleteSpecialHourUseCase, ListSpecialHoursUseCase, UpdateSpecialHourUseCase } from "../use-cases/manage-special-hours.use-case.js";

const dependencies = () => [new DrizzleRestaurantsRepository(), new DrizzleSpecialHoursRepository()] as const;
export async function listSpecialHoursController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = specialHoursParamsSchema.parse(request.params);
  return reply.status(200).send(await new ListSpecialHoursUseCase(...dependencies()).execute(restaurantId));
}
export async function createSpecialHourController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId } = specialHoursParamsSchema.parse(request.params); const body = specialHourBodySchema.parse(request.body);
  return reply.status(201).send(await new CreateSpecialHourUseCase(...dependencies()).execute(restaurantId, body));
}
export async function updateSpecialHourController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId, specialHourId } = specialHourParamsSchema.parse(request.params); const body = specialHourBodySchema.parse(request.body);
  return reply.status(200).send(await new UpdateSpecialHourUseCase(...dependencies()).execute(restaurantId, specialHourId, body));
}
export async function deleteSpecialHourController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId, specialHourId } = specialHourParamsSchema.parse(request.params);
  await new DeleteSpecialHourUseCase(...dependencies()).execute(restaurantId, specialHourId); return reply.status(204).send();
}
