import { FastifyReply, FastifyRequest } from "fastify";
import {
  createReservationBodySchema,
  createReservationParamsSchema,
} from "../schemas/reservation.schema.js";

import { CreateReservationUseCase } from "../use-cases/create-reservation.use-case.js";
import { DrizzleReservationTransactionManager } from "../repositories/drizzle-reservation-transaction-manager.js";

export async function createReservationController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = createReservationParamsSchema.parse(request.params);
  const body = createReservationBodySchema.parse(request.body);

  const transactionManager = new DrizzleReservationTransactionManager();
  const useCase = new CreateReservationUseCase(transactionManager);

  const reservation = await useCase.execute({
    restaurantId,
    tableId: body.tableId,
    customer: body.customer,
    people: body.people,
    startsAt: body.startsAt,
    endsAt: body.endsAt,
    observation: body.observation,
  });

  return reply.status(201).send(reservation);
}
