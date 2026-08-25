import { AddonsRepository } from "../repositories/addons-repository.js";

interface ListAddonsRequest {
  restaurantId: string;
  active?: boolean;
}

export class ListAddonsUseCase {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async execute(params: ListAddonsRequest) {
    return await this.addonsRepository.findMany(params);
  }
}
