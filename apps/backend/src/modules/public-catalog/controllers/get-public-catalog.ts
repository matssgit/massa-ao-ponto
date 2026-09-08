import type { FastifyReply, FastifyRequest } from "fastify";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { publicRestaurantParamsSchema } from "../../public-reservations/schemas/public-reservation.schema.js";
import { DrizzlePublicCatalogRepository } from "../repositories/drizzle-public-catalog-repository.js";
import { GetPublicCatalogUseCase } from "../use-cases/get-public-catalog.use-case.js";

export async function getPublicCatalogController(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = publicRestaurantParamsSchema.parse(request.params);
  const result = await new GetPublicCatalogUseCase(
    new DrizzleRestaurantsRepository(),
    new DrizzlePublicCatalogRepository(),
  ).execute(slug);
  return reply.status(200).send(result);
}
