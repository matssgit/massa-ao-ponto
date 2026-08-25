export class AddonRestaurantMismatchError extends Error {
  constructor() {
    super("Este adicional não pertence ao restaurante informado.");
    this.name = "AddonRestaurantMismatchError";
  }
}
