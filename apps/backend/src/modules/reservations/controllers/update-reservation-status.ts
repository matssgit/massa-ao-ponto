import { FastifyReply, FastifyRequest } from "fastify";
import {
  updateReservationStatusBodySchema,
  updateReservationStatusParamsSchema,
} from "../schemas/reservation.schema.js";

import { DrizzleReservationTransactionManager } from "../repositories/drizzle-reservation-transaction-manager.js";
import { UpdateReservationStatusUseCase } from "../use-cases/update-reservation-status.use-case.js";

export async function updateReservationStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { reservationId } = updateReservationStatusParamsSchema.parse(
    request.params,
  );
  const body = updateReservationStatusBodySchema.parse(request.body);

  const transactionManager = new DrizzleReservationTransactionManager();
  const useCase = new UpdateReservationStatusUseCase(transactionManager);

  const reservation = await useCase.execute({
    reservationId,
    newStatus: body.status,
    observation: body.observation,
  });

  return reply.status(200).send(reservation);
}
