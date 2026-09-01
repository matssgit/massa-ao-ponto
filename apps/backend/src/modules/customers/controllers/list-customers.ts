import { FastifyReply, FastifyRequest } from "fastify";
import {
  listCustomersParamsSchema,
  listCustomersQuerySchema,
} from "../schemas/customer.schema.js";

import { DrizzleCustomersRepository } from "../../reservations/repositories/drizzle-customers-repository.js";
import { ListCustomersUseCase } from "../use-cases/list-customers.use-case.js";

export async function listCustomersController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = listCustomersParamsSchema.parse(request.params);
  const query = listCustomersQuerySchema.parse(request.query);
  const customersRepository = new DrizzleCustomersRepository();
  const useCase = new ListCustomersUseCase(customersRepository);

  const result = await useCase.execute({
    restaurantId,
    search: query.search,
    page: query.page,
    limit: query.limit,
  });

  return reply.status(200).send(result);
}
