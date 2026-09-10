import type { FastifyReply, FastifyRequest } from "fastify";
import { DrizzleAddonsRepository } from "../../products/repositories/drizzle-addons-repository.js";
import { DrizzleProductAddonsRepository } from "../../products/repositories/drizzle-product-addons-repository.js";
import { DrizzleProductsRepository } from "../../products/repositories/drizzle-products-repository.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { DrizzleOrderItemsRepository } from "../../orders/repositories/drizzle-order-items-repository.js";
import { DrizzleOrdersRepository } from "../../orders/repositories/drizzle-orders-repository.js";
import { DrizzleOrderTransactionManager } from "../../orders/repositories/drizzle-order-transaction-manager.js";
import { CreateOrderUseCase } from "../../orders/use-cases/create-order.use-case.js";
import { publicRestaurantParamsSchema } from "../../public-reservations/schemas/public-reservation.schema.js";
import { createPublicOrderBodySchema, publicOrderTokenParamsSchema } from "../schemas/public-order.schema.js";
import { CancelPublicOrderUseCase } from "../use-cases/cancel-public-order.use-case.js";
import { CreatePublicOrderUseCase } from "../use-cases/create-public-order.use-case.js";
import { GetPublicOrderUseCase } from "../use-cases/get-public-order.use-case.js";
import { DrizzleDeliveriesRepository } from "../../orders/repositories/drizzle-deliveries-repository.js";

function makeCreateOrderUseCase() {
  return new CreateOrderUseCase(
    new DrizzleRestaurantsRepository(),
    new DrizzleProductsRepository(),
    new DrizzleAddonsRepository(),
    new DrizzleProductAddonsRepository(),
    new DrizzleOrderTransactionManager(),
  );
}

export async function createPublicOrderController(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = publicRestaurantParamsSchema.parse(request.params);
  const body = createPublicOrderBodySchema.parse(request.body);
  const result = await new CreatePublicOrderUseCase(
    new DrizzleRestaurantsRepository(),
    makeCreateOrderUseCase(),
    new DrizzleOrderItemsRepository(),
    new DrizzleDeliveriesRepository(),
  ).execute(slug, body);
  return reply.status(201).send(result);
}

export async function getPublicOrderController(request: FastifyRequest, reply: FastifyReply) {
  const { token } = publicOrderTokenParamsSchema.parse(request.params);
  const result = await new GetPublicOrderUseCase(
    new DrizzleOrdersRepository(),
    new DrizzleOrderItemsRepository(),
    new DrizzleDeliveriesRepository(),
  ).execute(token);
  return reply.status(200).send(result);
}

export async function cancelPublicOrderController(request: FastifyRequest, reply: FastifyReply) {
  const { token } = publicOrderTokenParamsSchema.parse(request.params);
  const result = await new CancelPublicOrderUseCase(
    new DrizzleOrdersRepository(),
    new DrizzleOrderItemsRepository(),
    new DrizzleOrderTransactionManager(),
    new DrizzleDeliveriesRepository(),
  ).execute(token);
  return reply.status(200).send(result);
}
