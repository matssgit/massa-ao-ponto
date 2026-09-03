import {
  Restaurant,
} from "../repositories/restaurants-repository.js";
import type { AuthRepository } from "../../auth/repositories/auth-repository.js";

export class ListRestaurantsUseCase {
  constructor(private authRepository: AuthRepository) {}

  async execute(userId: string): Promise<Restaurant[]> {
    return await this.authRepository.listAccessibleRestaurants(userId);
  }
}
