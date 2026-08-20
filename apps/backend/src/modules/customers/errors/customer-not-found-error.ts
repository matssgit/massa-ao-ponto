export class CustomerNotFoundError extends Error {
  constructor() {
    super("Cliente não encontrado.");
    this.name = "CustomerNotFoundError";
  }
}
