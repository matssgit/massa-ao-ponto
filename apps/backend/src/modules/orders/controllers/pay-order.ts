import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleOrderTransactionManager } from "../repositories/drizzle-order-transaction-manager.js";
import { PayOrderUseCase } from "../use-cases/pay-order.use-case.js";
import { payOrderParamsSchema } from "../schemas/order.schema.js";

export async function payOrderController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, orderId } = payOrderParamsSchema.parse(request.params);

  const transactionManager = new DrizzleOrderTransactionManager();
  const useCase = new PayOrderUseCase(transactionManager);

  const order = await useCase.execute({ restaurantId, orderId });

  return reply.status(200).send(order);
}
