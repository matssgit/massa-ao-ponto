import { FastifyReply, FastifyRequest } from "fastify";

import { DrizzleTablesRepository } from "../repositories/drizzle-tables-repository.js";
import { ListTablesUseCase } from "../use-cases/list-tables.use-case.js";
import { createTableParamsSchema } from "../schemas/table.schema.js";

export async function listTablesController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId } = createTableParamsSchema.parse(request.params);

  const tablesRepository = new DrizzleTablesRepository();
  const useCase = new ListTablesUseCase(tablesRepository);

  const tables = await useCase.execute({ restaurantId });

  return reply.status(200).send(tables);
}
