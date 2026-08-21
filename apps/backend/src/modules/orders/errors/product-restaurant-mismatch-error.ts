export class ProductRestaurantMismatchError extends Error {
  constructor() {
    super("O produto não pertence a este restaurante.");
    this.name = "ProductRestaurantMismatchError";
  }
}
