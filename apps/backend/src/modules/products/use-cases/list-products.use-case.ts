import { ProductsRepository } from "../repositories/products-repository.js";

interface ListProductsRequest {
  restaurantId: string;
  categoryId?: string;
  active?: boolean;
}

export class ListProductsUseCase {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async execute(filters: ListProductsRequest) {
    return await this.productsRepository.findMany(filters);
  }
}
