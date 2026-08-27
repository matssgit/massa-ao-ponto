import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleCustomersRepository } from "../../reservations/repositories/drizzle-customers-repository.js";
import { GetCustomerUseCase } from "../use-cases/get-customer.use-case.js";
import { getCustomerParamsSchema } from "../schemas/customer.schema.js";

export async function getCustomerController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, customerId } = getCustomerParamsSchema.parse(
    request.params,
  );

  const customersRepository = new DrizzleCustomersRepository();
  const useCase = new GetCustomerUseCase(customersRepository);

  const customer = await useCase.execute({ restaurantId, customerId });

  return reply.status(200).send(customer);
}
