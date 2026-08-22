export class DeliveryNotFoundError extends Error {
  constructor() {
    super("Delivery não encontrado.");
    this.name = "DeliveryNotFoundError";
  }
}
