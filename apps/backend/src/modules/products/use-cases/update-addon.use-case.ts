import { AddonNotFoundError } from "../errors/addon-not-found-error.js";
import { AddonRestaurantMismatchError } from "../errors/addon-restaurant-mismatch-error.js";
import { AddonsRepository } from "../repositories/addons-repository.js";

interface UpdateAddonRequest {
  restaurantId: string;
  addonId: string;
  name?: string;
  description?: string | null;
  price?: number;
  active?: boolean;
}

export class UpdateAddonUseCase {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async execute({ restaurantId, addonId, ...data }: UpdateAddonRequest) {
    const addon = await this.addonsRepository.findById(addonId);

    if (!addon) throw new AddonNotFoundError();
    if (addon.restaurantId !== restaurantId)
      throw new AddonRestaurantMismatchError();

    if (Object.keys(data).length === 0) return addon;

    return await this.addonsRepository.update(addonId, data);
  }
}
