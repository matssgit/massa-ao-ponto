export class InvalidItemQuantityError extends Error {
  constructor() {
    super("A quantidade do item deve ser maior que zero.");
    this.name = "InvalidItemQuantityError";
  }
}
