export class InvalidOrderTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidOrderTypeError";
  }
}
