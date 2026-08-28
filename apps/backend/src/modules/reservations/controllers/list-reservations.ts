import { FastifyReply, FastifyRequest } from "fastify";
import {
  createReservationParamsSchema,
  listReservationsQuerySchema,
} from "../schemas/reservation.schema.js";

import { DrizzleCustomersRepository } from "../repositories/drizzle-customers-repository.js";
import { DrizzleReservationsRepository } from "../repositories/drizzle-reservations-repository.js";
import { DrizzleTablesRepository } from "../../tables/repositories/drizzle-tables-repository.js";
import { ListReservationsUseCase } from "../use-cases/list-reservations.use-case.js";

export async function listReservationsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = createReservationParamsSchema.parse(request.params);
  const query = listReservationsQuerySchema.parse(request.query);

  const reservationsRepository = new DrizzleReservationsRepository();
  const customersRepository = new DrizzleCustomersRepository();
  const tablesRepository = new DrizzleTablesRepository();
  const useCase = new ListReservationsUseCase(
    reservationsRepository,
    customersRepository,
    tablesRepository,
  );

  const reservations = await useCase.execute({
    restaurantId,
    status: query.status,
    startsAt: query.startsAt,
    endsAt: query.endsAt,
    page: query.page,
    limit: query.limit,
  });

  return reply.status(200).send(reservations);
}
