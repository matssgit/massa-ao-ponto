export class PublicRateLimitError extends Error {
  readonly statusCode = 429;

  constructor() {
    super("Too many public reservation requests. Please try again later.");
    this.name = "PublicRateLimitError";
  }
}