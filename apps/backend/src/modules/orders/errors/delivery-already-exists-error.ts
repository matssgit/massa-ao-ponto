export class DeliveryAlreadyExistsError extends Error {
  constructor() {
    super("Já existe um delivery ativo para este pedido.");
    this.name = "DeliveryAlreadyExistsError";
  }
}
