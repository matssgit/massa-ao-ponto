import { AddonsRepository } from "../repositories/addons-repository.js";

interface CreateAddonRequest {
  restaurantId: string;
  name: string;
  description?: string | null;
  price: number;
}

export class CreateAddonUseCase {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async execute(data: CreateAddonRequest) {
    return await this.addonsRepository.create(data);
  }
}
