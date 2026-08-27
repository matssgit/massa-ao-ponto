export class PaidOrderCannotBeCancelledError extends Error {
  constructor() {
    super("Pedido pago não pode ser cancelado sem estorno.");
    this.name = "PaidOrderCannotBeCancelledError";
  }
}
