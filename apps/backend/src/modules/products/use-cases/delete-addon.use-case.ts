import { AddonNotFoundError } from "../errors/addon-not-found-error.js";
import { AddonRestaurantMismatchError } from "../errors/addon-restaurant-mismatch-error.js";
import { AddonsRepository } from "../repositories/addons-repository.js";

interface DeleteAddonRequest {
  restaurantId: string;
  addonId: string;
}

export class DeleteAddonUseCase {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async execute({ restaurantId, addonId }: DeleteAddonRequest) {
    const addon = await this.addonsRepository.findById(addonId);

    if (!addon) throw new AddonNotFoundError();
    if (addon.restaurantId !== restaurantId)
      throw new AddonRestaurantMismatchError();

    await this.addonsRepository.delete(addonId);
  }
}
