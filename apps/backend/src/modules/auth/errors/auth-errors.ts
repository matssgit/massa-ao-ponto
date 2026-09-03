export class AuthRateLimitError extends Error {
  readonly statusCode = 429;

  constructor() {
    super("Too many login attempts. Please try again later.");
    this.name = "AuthRateLimitError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("Access denied.");
    this.name = "ForbiddenError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required.");
    this.name = "UnauthenticatedError";
  }
}

export class InvalidCsrfError extends Error {
  constructor() {
    super("Invalid CSRF protection.");
    this.name = "InvalidCsrfError";
  }
}
