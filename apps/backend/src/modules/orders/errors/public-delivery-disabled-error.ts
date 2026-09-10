export class PublicDeliveryDisabledError extends Error {
  constructor() {
    super("Este restaurante não está aceitando pedidos para entrega.");
    this.name = "PublicDeliveryDisabledError";
  }
}
