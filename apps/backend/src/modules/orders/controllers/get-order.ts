import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleOrderItemsRepository } from "../repositories/drizzle-order-items-repository.js";
import { DrizzleOrderHistoryRepository } from "../repositories/drizzle-order-history-repository.js";
import { DrizzleDeliveriesRepository } from "../repositories/drizzle-deliveries-repository.js";
import { DrizzleDeliveryHistoryRepository } from "../repositories/drizzle-delivery-history-repository.js";
import { DrizzleOrdersRepository } from "../repositories/drizzle-orders-repository.js";
import { GetOrderUseCase } from "../use-cases/get-order.use-case.js";
import { getOrderParamsSchema } from "../schemas/order.schema.js";

export async function getOrderController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, orderId } = getOrderParamsSchema.parse(request.params);

  const ordersRepository = new DrizzleOrdersRepository();
  const orderItemsRepository = new DrizzleOrderItemsRepository();
  const orderHistoryRepository = new DrizzleOrderHistoryRepository();
  const deliveriesRepository = new DrizzleDeliveriesRepository();
  const deliveryHistoryRepository = new DrizzleDeliveryHistoryRepository();
  const useCase = new GetOrderUseCase(
    ordersRepository,
    orderItemsRepository,
    orderHistoryRepository,
    deliveriesRepository,
    deliveryHistoryRepository,
  );

  const result = await useCase.execute({ restaurantId, orderId });

  return reply.status(200).send(result);
}
