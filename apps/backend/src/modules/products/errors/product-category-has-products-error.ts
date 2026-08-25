export class ProductCategoryHasProductsError extends Error {
  constructor() {
    super('Não é possível excluir uma categoria que possui produtos.');
    this.name = 'ProductCategoryHasProductsError';
  }
}