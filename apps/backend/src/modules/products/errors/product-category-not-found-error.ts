export class ProductCategoryNotFoundError extends Error {
  constructor() {
    super("Categoria de produto não encontrada.");
    this.name = "ProductCategoryNotFoundError";
  }
}
