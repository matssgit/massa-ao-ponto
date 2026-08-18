import { Table, TablesRepository } from "../repositories/tables-repository.js";

interface ListTablesUseCaseRequest {
  restaurantId: string;
}

export class ListTablesUseCase {
  constructor(private tablesRepository: TablesRepository) {}

  async execute({ restaurantId }: ListTablesUseCaseRequest): Promise<Table[]> {
    return await this.tablesRepository.findByRestaurantId(restaurantId);
  }
}
