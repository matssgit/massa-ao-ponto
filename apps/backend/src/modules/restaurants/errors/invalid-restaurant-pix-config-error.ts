export class InvalidRestaurantPixConfigError extends Error {
  constructor() {
    super("A chave Pix e o nome do recebedor devem ser configurados juntos.");
    this.name = "InvalidRestaurantPixConfigError";
  }
}
