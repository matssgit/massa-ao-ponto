import { FastifyReply, FastifyRequest } from "fastify";

import { CancelOrderUseCase } from "../use-cases/cancel-order.use-case.js";
import { DrizzleOrderTransactionManager } from "../repositories/drizzle-order-transaction-manager.js";
import { cancelOrderParamsSchema } from "../schemas/order.schema.js";

export async function cancelOrderController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { orderId } = cancelOrderParamsSchema.parse(request.params);

  const transactionManager = new DrizzleOrderTransactionManager();
  const useCase = new CancelOrderUseCase(transactionManager);

  await useCase.execute({ orderId });

  return reply.status(200).send({ status: "CANCELLED" });
}
