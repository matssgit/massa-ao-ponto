import { AddonNotFoundError } from "../errors/addon-not-found-error.js";
import { AddonsRepository } from "../repositories/addons-repository.js";

interface GetAddonRequest {
  restaurantId: string;
  addonId: string;
}

export class GetAddonUseCase {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async execute({ restaurantId, addonId }: GetAddonRequest) {
    const addon = await this.addonsRepository.findByIdAndRestaurantId(
      addonId,
      restaurantId,
    );

    if (!addon) {
      throw new AddonNotFoundError();
    }

    return addon;
  }
}
