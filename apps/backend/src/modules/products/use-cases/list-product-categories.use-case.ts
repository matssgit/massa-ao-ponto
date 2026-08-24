import { ProductCategoriesRepository } from "../repositories/product-categories-repository.js";

interface ListProductCategoriesRequest {
  restaurantId: string;
}

export class ListProductCategoriesUseCase {
  constructor(
    private readonly productCategoriesRepository: ProductCategoriesRepository,
  ) {}

  async execute({ restaurantId }: ListProductCategoriesRequest) {
    return await this.productCategoriesRepository.findMany(restaurantId);
  }
}
