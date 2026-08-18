import {
  Restaurant,
  RestaurantsRepository,
} from "../repositories/restaurants-repository.js";

export class ListRestaurantsUseCase {
  constructor(private restaurantsRepository: RestaurantsRepository) {}

  async execute(): Promise<Restaurant[]> {
    return await this.restaurantsRepository.findAll();
  }
}
