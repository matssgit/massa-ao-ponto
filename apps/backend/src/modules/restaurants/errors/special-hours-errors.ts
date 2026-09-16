export class SpecialHourConflictError extends Error {
  constructor() { super("A special date already exists for this Restaurant."); this.name = "SpecialHourConflictError"; }
}
export class SpecialHourNotFoundError extends Error {
  constructor() { super("Special date not found."); this.name = "SpecialHourNotFoundError"; }
}
