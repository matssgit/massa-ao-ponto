import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleOrderItemsRepository } from "../repositories/drizzle-order-items-repository.js";
import { DrizzleOrdersRepository } from "../repositories/drizzle-orders-repository.js";
import { GetOrderUseCase } from "../use-cases/get-order.use-case.js";
import { getOrderParamsSchema } from "../schemas/order.schema.js";

export async function getOrderController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { orderId } = getOrderParamsSchema.parse(request.params);

  const ordersRepository = new DrizzleOrdersRepository();
  const orderItemsRepository = new DrizzleOrderItemsRepository();
  const useCase = new GetOrderUseCase(ordersRepository, orderItemsRepository);

  const result = await useCase.execute(orderId);

  return reply.status(200).send(result);
}
