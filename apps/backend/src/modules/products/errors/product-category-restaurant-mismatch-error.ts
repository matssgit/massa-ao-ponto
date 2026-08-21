export class ProductCategoryRestaurantMismatchError extends Error {
  constructor() {
    super("A categoria informada não pertence a este restaurante.");
    this.name = "ProductCategoryRestaurantMismatchError";
  }
}
