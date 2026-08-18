export class RestaurantNotFoundError extends Error {
  constructor() {
    super("Restaurant not found.");
    this.name = "RestaurantNotFoundError";
  }
}
