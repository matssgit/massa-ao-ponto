import {
  Restaurant,
  RestaurantsRepository,
} from "../repositories/restaurants-repository.js";

interface CreateRestaurantUseCaseRequest {
  name: string;
  address: string;
  phone: string;
  timezone: string;
}

export class CreateRestaurantUseCase {
  constructor(private restaurantsRepository: RestaurantsRepository) {}

  async execute(request: CreateRestaurantUseCaseRequest): Promise<Restaurant> {
    // Aqui não tem Request, Reply, Zod ou HTTP Status. Apenas dados primitivos e lógica.
    const restaurant = await this.restaurantsRepository.create({
      name: request.name,
      address: request.address,
      phone: request.phone,
      timezone: request.timezone,
    });

    return restaurant;
  }
}
