export class InvalidDeliveryOrderTypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDeliveryOrderTypeError";
  }
}
