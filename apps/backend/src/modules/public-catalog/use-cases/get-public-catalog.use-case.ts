import { RestaurantNotFoundError } from "../../restaurants/errors/restaurant-not-found-error.js";
import type { RestaurantsRepository } from "../../restaurants/repositories/restaurants-repository.js";
import type { PublicCatalogRepository } from "../repositories/public-catalog-repository.js";

export class GetPublicCatalogUseCase {
  constructor(
    private readonly restaurants: RestaurantsRepository,
    private readonly catalog: PublicCatalogRepository,
  ) {}

  async execute(slug: string) {
    const restaurant = await this.restaurants.findPublishedBySlug(slug);
    if (!restaurant) throw new RestaurantNotFoundError();

    const catalog = await this.catalog.findByRestaurantId(restaurant.id);
    const addonsByProduct = new Map<string, typeof catalog.addons>();
    for (const addon of catalog.addons) {
      const addons = addonsByProduct.get(addon.productId) ?? [];
      addons.push(addon);
      addonsByProduct.set(addon.productId, addons);
    }
    const productsByCategory = new Map<string, typeof catalog.products>();
    for (const product of catalog.products) {
      const products = productsByCategory.get(product.categoryId) ?? [];
      products.push(product);
      productsByCategory.set(product.categoryId, products);
    }

    return {
      categories: catalog.categories.map((category) => ({
        ...category,
        products: (productsByCategory.get(category.id) ?? []).map((product) => ({
          ...product,
          addons: (addonsByProduct.get(product.id) ?? []).map(({ productId, ...addon }) => addon),
        })),
      })),
    };
  }
}
