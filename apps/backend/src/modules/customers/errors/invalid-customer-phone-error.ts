export class InvalidCustomerPhoneError extends Error {
  constructor() {
    super("Customer phone must contain at least 10 digits.");
  }
}
