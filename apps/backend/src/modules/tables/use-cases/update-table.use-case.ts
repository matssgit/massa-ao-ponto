import {
  TablesRepository,
  UpdateTableInput,
} from "../repositories/tables-repository.js";

import { TableNotFoundError } from "../../reservations/errors/table-not-found-error.js";
import { TableNumberAlreadyExistsError } from "../errors/table-number-already-exists-error.js";

interface UpdateTableRequest extends UpdateTableInput {
  restaurantId: string;
  tableId: string;
}

export class UpdateTableUseCase {
  constructor(private readonly tablesRepository: TablesRepository) {}

  async execute({ restaurantId, tableId, ...data }: UpdateTableRequest) {
    const table = await this.tablesRepository.findByIdAndRestaurantId(
      tableId,
      restaurantId,
    );

    if (!table) {
      throw new TableNotFoundError();
    }

    if (data.number && data.number !== table.number) {
      const tableWithSameNumber =
        await this.tablesRepository.findByRestaurantAndNumber(
          restaurantId,
          data.number,
        );

      if (tableWithSameNumber && tableWithSameNumber.id !== tableId) {
        throw new TableNumberAlreadyExistsError();
      }
    }

    if (Object.keys(data).length === 0) {
      return table;
    }

    const updatedTable =
      await this.tablesRepository.updateByIdAndRestaurantId(
        tableId,
        restaurantId,
        data,
      );

    if (!updatedTable) {
      throw new TableNotFoundError();
    }

    return updatedTable;
  }
}
