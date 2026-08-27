import { AddonNotFoundError } from "../errors/addon-not-found-error.js";
import { AddonsRepository } from "../repositories/addons-repository.js";

interface ToggleAddonStatusRequest {
  restaurantId: string;
  addonId: string;
}

export class ToggleAddonStatusUseCase {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async execute({ restaurantId, addonId }: ToggleAddonStatusRequest) {
    const addon = await this.addonsRepository.findByIdAndRestaurantId(
      addonId,
      restaurantId,
    );

    if (!addon) {
      throw new AddonNotFoundError();
    }

    return await this.addonsRepository.update(addonId, {
      active: !addon.active,
    });
  }
}
