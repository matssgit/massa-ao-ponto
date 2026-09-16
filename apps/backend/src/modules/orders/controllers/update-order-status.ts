import { FastifyReply, FastifyRequest } from "fastify";
import {
  updateOrderStatusBodySchema,
  updateOrderStatusParamsSchema,
} from "../schemas/order.schema.js";

import { DrizzleOrderTransactionManager } from "../repositories/drizzle-order-transaction-manager.js";
import { UpdateOrderStatusUseCase } from "../use-cases/update-order-status.use-case.js";
import { makeWhatsAppNotificationService } from "../../notifications/notification-factory.js";

export async function updateOrderStatusController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, orderId } = updateOrderStatusParamsSchema.parse(
    request.params,
  );
  const { status } = updateOrderStatusBodySchema.parse(request.body);

  const transactionManager = new DrizzleOrderTransactionManager();
  const useCase = new UpdateOrderStatusUseCase(transactionManager);

  await useCase.execute({ restaurantId, orderId, status });

  if (status === "CONFIRMED" || status === "READY") {
    await makeWhatsAppNotificationService(request.log).notifyOrderStatus(orderId, status);
  }

  return reply.status(204).send();
}
