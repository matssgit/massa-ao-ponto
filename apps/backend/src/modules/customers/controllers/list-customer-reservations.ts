import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleCustomersRepository } from "../../reservations/repositories/drizzle-customers-repository.js";
import { DrizzleReservationsRepository } from "../../reservations/repositories/drizzle-reservations-repository.js";
import { ListCustomerReservationsUseCase } from "../use-cases/list-customer.reservations.use-case.js";
import { getCustomerParamsSchema } from "../schemas/customer.schema.js";

export async function listCustomerReservationsController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, customerId } = getCustomerParamsSchema.parse(
    request.params,
  );

  const customersRepository = new DrizzleCustomersRepository();
  const reservationsRepository = new DrizzleReservationsRepository();
  const useCase = new ListCustomerReservationsUseCase(
    customersRepository,
    reservationsRepository,
  );

  const reservations = await useCase.execute({ restaurantId, customerId });

  return reply.status(200).send(reservations);
}
