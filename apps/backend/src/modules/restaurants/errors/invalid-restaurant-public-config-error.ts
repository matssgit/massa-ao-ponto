export class InvalidRestaurantPublicConfigError extends Error {
  constructor() {
    super("A public Restaurant requires a valid slug.");
    this.name = "InvalidRestaurantPublicConfigError";
  }
}