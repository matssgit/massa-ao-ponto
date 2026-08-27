import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleReservationsRepository } from "../repositories/drizzle-reservations-repository.js";
import { GetReservationUseCase } from "../use-cases/get-reservation.use-case.js";
import { getReservationParamsSchema } from "../schemas/reservation.schema.js";

export async function getReservationController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, reservationId } = getReservationParamsSchema.parse(
    request.params,
  );

  const reservationsRepository = new DrizzleReservationsRepository();
  const useCase = new GetReservationUseCase(reservationsRepository);

  const reservation = await useCase.execute({ restaurantId, reservationId });

  return reply.status(200).send(reservation);
}
