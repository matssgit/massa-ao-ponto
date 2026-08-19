import { FastifyReply, FastifyRequest } from "fastify";
import {
  createReservationParamsSchema,
  listReservationsQuerySchema,
} from "../schemas/reservation.schema.js";

import { DrizzleReservationsRepository } from "../repositories/drizzle-reservations-repository.js";
import { ListReservationsUseCase } from "../use-cases/list-reservations.use-case.js";

export async function listReservationsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = createReservationParamsSchema.parse(request.params);
  const query = listReservationsQuerySchema.parse(request.query);

  const reservationsRepository = new DrizzleReservationsRepository();
  const useCase = new ListReservationsUseCase(reservationsRepository);

  const reservations = await useCase.execute({
    restaurantId,
    status: query.status,
    startsAt: query.startsAt,
    endsAt: query.endsAt,
  });

  return reply.status(200).send(reservations);
}
