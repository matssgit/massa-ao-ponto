import { FastifyReply, FastifyRequest } from "fastify";
import {
  createTableBodySchema,
  createTableParamsSchema,
} from "../schemas/table.schema.js";

import { CreateTableUseCase } from "../use-cases/create-table.use-case.js";
import { DrizzleRestaurantsRepository } from "../../restaurants/repositories/drizzle-restaurants-repository.js";
import { DrizzleTablesRepository } from "../repositories/drizzle-tables-repository.js";

export async function createTableController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = createTableParamsSchema.parse(request.params);
  const body = createTableBodySchema.parse(request.body);

  const tablesRepository = new DrizzleTablesRepository();
  const restaurantsRepository = new DrizzleRestaurantsRepository();
  const useCase = new CreateTableUseCase(
    tablesRepository,
    restaurantsRepository,
  );

  const table = await useCase.execute({
    restaurantId,
    number: body.number,
    capacity: body.capacity,
    type: body.type,
  });

  return reply.status(201).send(table);
}
