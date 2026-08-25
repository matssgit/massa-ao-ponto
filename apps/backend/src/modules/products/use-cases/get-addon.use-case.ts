import { AddonNotFoundError } from "../errors/addon-not-found-error.js";
import { AddonsRepository } from "../repositories/addons-repository.js";

interface GetAddonRequest {
  addonId: string;
}

export class GetAddonUseCase {
  constructor(private readonly addonsRepository: AddonsRepository) {}

  async execute({ addonId }: GetAddonRequest) {
    const addon = await this.addonsRepository.findById(addonId);

    if (!addon) {
      throw new AddonNotFoundError();
    }

    return addon;
  }
}
