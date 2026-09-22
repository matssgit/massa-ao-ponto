export class PixPaymentUnavailableError extends Error {
  constructor() {
    super("O pagamento via Pix não está configurado para este restaurante.");
    this.name = "PixPaymentUnavailableError";
  }
}
