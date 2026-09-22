export class InvalidCashChangeError extends Error {
  constructor(message = "O troco só pode ser informado para pagamento em dinheiro e deve cobrir o total do pedido.") {
    super(message);
    this.name = "InvalidCashChangeError";
  }
}
