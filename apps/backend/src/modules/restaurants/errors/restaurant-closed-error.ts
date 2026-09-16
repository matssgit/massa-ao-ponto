export class RestaurantClosedError extends Error {
  constructor() {
    super("Restaurant is closed for the requested time.");
    this.name = "RestaurantClosedError";
  }
}
