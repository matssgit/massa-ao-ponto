import { Table, TablesRepository } from "../repositories/tables-repository.js";

import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import { TableNumberAlreadyExistsError } from "../errors/table-number-already-exists-error.js";

interface CreateTableUseCaseRequest {
  restaurantId: string;
  number: string;
  capacity: number;
  type: string;
}

export class CreateTableUseCase {
  constructor(
    private tablesRepository: TablesRepository,
    private restaurantsRepository: RestaurantsRepository,
  ) {}

  async execute(request: CreateTableUseCaseRequest): Promise<Table> {
    const restaurant = await this.restaurantsRepository.findById(
      request.restaurantId,
    );

    if (!restaurant) {
      throw new RestaurantNotFoundError();
    }

    const tableWithSameNumber =
      await this.tablesRepository.findByRestaurantAndNumber(
        request.restaurantId,
        request.number,
      );

    if (tableWithSameNumber) {
      throw new TableNumberAlreadyExistsError();
    }

    return await this.tablesRepository.create({
      restaurantId: request.restaurantId,
      number: request.number,
      capacity: request.capacity,
      type: request.type,
    });
  }
}
