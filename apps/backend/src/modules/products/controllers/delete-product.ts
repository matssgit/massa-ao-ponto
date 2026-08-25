import { FastifyReply, FastifyRequest } from 'fastify';

import { DeleteProductUseCase } from '../use-cases/delete-product.use-case.js';
import { DrizzleOrderItemsRepository } from '../../orders/repositories/drizzle-order-items-repository.js';
import { DrizzleProductsRepository } from '../repositories/drizzle-products-repository.js';
import { deleteProductParamsSchema } from '../schemas/product.schema.js';

export async function deleteProductController(request: FastifyRequest, reply: FastifyReply) {
  const { restaurantId, productId } = deleteProductParamsSchema.parse(request.params);

  const productsRepository = new DrizzleProductsRepository();
  const orderItemsRepository = new DrizzleOrderItemsRepository();
  const useCase = new DeleteProductUseCase(productsRepository, orderItemsRepository);

  await useCase.execute({ restaurantId, productId });

  return reply.status(204).send();
}