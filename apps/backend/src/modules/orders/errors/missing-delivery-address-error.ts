export class MissingDeliveryAddressError extends Error {
  constructor() {
    super("O endereço de entrega é obrigatório para pedidos do tipo DELIVERY.");
    this.name = "MissingDeliveryAddressError";
  }
}
