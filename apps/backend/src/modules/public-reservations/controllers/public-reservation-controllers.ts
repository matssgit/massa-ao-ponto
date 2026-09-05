import type { FastifyReply, FastifyRequest } from "fastify";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { DrizzleReservationsRepository } from "../../reservations/repositories/drizzle-reservations-repository.js";
import { DrizzleReservationTransactionManager } from "../../reservations/repositories/drizzle-reservation-transaction-manager.js";
import { DrizzleTablesRepository } from "../../tables/repositories/drizzle-tables-repository.js";
import {
  createPublicReservationBodySchema,
  publicAvailabilityQuerySchema,
  publicReservationTokenParamsSchema,
  publicRestaurantParamsSchema,
} from "../schemas/public-reservation.schema.js";
import { CancelPublicReservationUseCase } from "../use-cases/cancel-public-reservation.use-case.js";
import { CreatePublicReservationUseCase } from "../use-cases/create-public-reservation.use-case.js";
import { GetPublicAvailabilityUseCase } from "../use-cases/get-public-availability.use-case.js";
import { GetPublicReservationUseCase } from "../use-cases/get-public-reservation.use-case.js";
import { GetPublicRestaurantUseCase } from "../use-cases/get-public-restaurant.use-case.js";

export async function getPublicRestaurantController(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = publicRestaurantParamsSchema.parse(request.params);
  const result = await new GetPublicRestaurantUseCase(new DrizzleRestaurantsRepository()).execute(slug);
  return reply.status(200).send(result);
}

export async function getPublicAvailabilityController(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = publicRestaurantParamsSchema.parse(request.params);
  const query = publicAvailabilityQuerySchema.parse(request.query);
  const result = await new GetPublicAvailabilityUseCase(
    new DrizzleRestaurantsRepository(),
    new DrizzleTablesRepository(),
    new DrizzleReservationsRepository(),
  ).execute({ slug, ...query });
  return reply.status(200).send(result);
}

export async function createPublicReservationController(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = publicRestaurantParamsSchema.parse(request.params);
  const body = createPublicReservationBodySchema.parse(request.body);
  const result = await new CreatePublicReservationUseCase(
    new DrizzleRestaurantsRepository(),
    new DrizzleTablesRepository(),
    new DrizzleReservationTransactionManager(),
  ).execute({ slug, ...body });
  return reply.status(201).send(result);
}

export async function getPublicReservationController(request: FastifyRequest, reply: FastifyReply) {
  const { token } = publicReservationTokenParamsSchema.parse(request.params);
  const result = await new GetPublicReservationUseCase(
    new DrizzleReservationsRepository(),
    new DrizzleRestaurantsRepository(),
    new DrizzleTablesRepository(),
  ).execute(token);
  return reply.status(200).send(result);
}

export async function cancelPublicReservationController(request: FastifyRequest, reply: FastifyReply) {
  const { token } = publicReservationTokenParamsSchema.parse(request.params);
  const result = await new CancelPublicReservationUseCase(
    new DrizzleReservationsRepository(),
    new DrizzleRestaurantsRepository(),
    new DrizzleTablesRepository(),
    new DrizzleReservationTransactionManager(),
  ).execute(token, new Date());
  return reply.status(200).send(result);
}