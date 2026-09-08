export class PublicOrderNotFoundError extends Error {
  constructor() {
    super("Public order not found or access token is invalid.");
    this.name = "PublicOrderNotFoundError";
  }
}
