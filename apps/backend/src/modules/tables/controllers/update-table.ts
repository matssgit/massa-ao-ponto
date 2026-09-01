import { FastifyReply, FastifyRequest } from "fastify";
import {
  updateTableBodySchema,
  updateTableParamsSchema,
} from "../schemas/table.schema.js";

import { DrizzleTablesRepository } from "../repositories/drizzle-tables-repository.js";
import { UpdateTableUseCase } from "../use-cases/update-table.use-case.js";

export async function updateTableController(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { restaurantId, tableId } = updateTableParamsSchema.parse(
    request.params,
  );
  const data = updateTableBodySchema.parse(request.body);
  const tablesRepository = new DrizzleTablesRepository();
  const useCase = new UpdateTableUseCase(tablesRepository);

  const table = await useCase.execute({ restaurantId, tableId, ...data });

  return reply.status(200).send(table);
}
