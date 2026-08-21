import { FastifyReply, FastifyRequest } from "fastify";
import {
  listOrdersParamsSchema,
  listOrdersQuerySchema,
} from "../schemas/order.schema.js";

import { DrizzleOrderItemsRepository } from "../repositories/drizzle-order-items-repository.js";
import { DrizzleOrdersRepository } from "../repositories/drizzle-orders-repository.js";
import { ListOrdersUseCase } from "../use-cases/list-orders.use-case.js";

export async function listOrdersController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = listOrdersParamsSchema.parse(request.params);
  const filters = listOrdersQuerySchema.parse(request.query);

  const ordersRepository = new DrizzleOrdersRepository();
  const orderItemsRepository = new DrizzleOrderItemsRepository();
  const useCase = new ListOrdersUseCase(ordersRepository, orderItemsRepository);

  const result = await useCase.execute({
    restaurantId,
    ...filters,
  });

  return reply.status(200).send(result);
}
