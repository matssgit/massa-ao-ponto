export class InvalidOrderPaymentTransitionError extends Error {
  constructor(reason: string) {
    super(`Não é possível confirmar o pagamento: ${reason}`);
    this.name = "InvalidOrderPaymentTransitionError";
  }
}
