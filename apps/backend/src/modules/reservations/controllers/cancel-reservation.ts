import { FastifyReply, FastifyRequest } from "fastify";

import { CancelReservationUseCase } from "../use-cases/cancel-reservation.use-case.js";
import { DrizzleReservationTransactionManager } from "../repositories/drizzle-reservation-transaction-manager.js";
import { cancelReservationParamsSchema } from "../schemas/reservation.schema.js";

export async function cancelReservationController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { reservationId } = cancelReservationParamsSchema.parse(request.params);

  const transactionManager = new DrizzleReservationTransactionManager();
  const useCase = new CancelReservationUseCase(transactionManager);

  const reservation = await useCase.execute({
    reservationId,
    now: new Date(),
  });

  return reply.status(200).send(reservation);
}
