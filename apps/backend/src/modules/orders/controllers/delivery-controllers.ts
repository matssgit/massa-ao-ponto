import { FastifyReply, FastifyRequest } from "fastify";

import { CompleteDeliveryUseCase } from "../use-cases/complete-delivery.use-case.js";
import { CreateDeliveryUseCase } from "../use-cases/create-delivery.use-case.js";
import { DrizzleDeliveryTransactionManager } from "../repositories/drizzle-delivery-transaction-manager.js";
import { deliveryParamsSchema } from "../schemas/order.schema.js";
import { StartDeliveryUseCase } from "../use-cases/start-delivery.use-case.js";

export async function createDeliveryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, orderId } = deliveryParamsSchema.parse(request.params);
  const manager = new DrizzleDeliveryTransactionManager();
  const useCase = new CreateDeliveryUseCase(manager);
  const delivery = await useCase.execute({ restaurantId, orderId });
  return reply.status(201).send(delivery);
}

export async function startDeliveryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, orderId } = deliveryParamsSchema.parse(request.params);
  const manager = new DrizzleDeliveryTransactionManager();
  const useCase = new StartDeliveryUseCase(manager);
  await useCase.execute({ restaurantId, orderId });
  return reply.status(204).send();
}

export async function completeDeliveryController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, orderId } = deliveryParamsSchema.parse(request.params);
  const manager = new DrizzleDeliveryTransactionManager();
  const useCase = new CompleteDeliveryUseCase(manager);
  await useCase.execute({ restaurantId, orderId });
  return reply.status(204).send();
}
