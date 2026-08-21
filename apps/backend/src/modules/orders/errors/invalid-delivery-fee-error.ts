export class InvalidDeliveryFeeError extends Error {
  constructor() {
    super("Taxa de entrega inválida para o tipo de pedido informado.");
    this.name = "InvalidDeliveryFeeError";
  }
}
