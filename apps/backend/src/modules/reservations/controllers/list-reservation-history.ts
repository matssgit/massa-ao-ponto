import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleReservationHistoryRepository } from "../repositories/drizzle-reservation-history-repository.js";
import { DrizzleReservationsRepository } from "../repositories/drizzle-reservations-repository.js";
import { ListReservationHistoryUseCase } from "../use-cases/list-reservation-history.use-case.js";
import { getReservationParamsSchema } from "../schemas/reservation.schema.js";

export async function listReservationHistoryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { reservationId } = getReservationParamsSchema.parse(request.params);

  const reservationsRepository = new DrizzleReservationsRepository();
  const historyRepository = new DrizzleReservationHistoryRepository();
  const useCase = new ListReservationHistoryUseCase(
    reservationsRepository,
    historyRepository,
  );

  const history = await useCase.execute({ reservationId });

  return reply.status(200).send(history);
}
