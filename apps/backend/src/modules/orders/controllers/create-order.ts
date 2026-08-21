import { FastifyReply, FastifyRequest } from "fastify";
import {
  createOrderBodySchema,
  createOrderParamsSchema,
} from "../schemas/order.schema.js";

import { CreateOrderUseCase } from "../use-cases/create-order.use-case.js";
import { DrizzleCustomersRepository } from "../../reservations/repositories/drizzle-customers-repository.js";
import { DrizzleOrderTransactionManager } from "../repositories/drizzle-order-transaction-manager.js";
import { DrizzleProductsRepository } from "../../products/repositories/drizzle-products-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";

export async function createOrderController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = createOrderParamsSchema.parse(request.params);
  const body = createOrderBodySchema.parse(request.body);

  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const customersRepository = new DrizzleCustomersRepository();
  const productsRepository = new DrizzleProductsRepository();
  const transactionManager = new DrizzleOrderTransactionManager();

  const useCase = new CreateOrderUseCase(
    restaurantsRepository,
    customersRepository,
    productsRepository,
    transactionManager,
  );

  const order = await useCase.execute({
    restaurantId,
    ...body,
  });

  return reply.status(201).send(order);
}
