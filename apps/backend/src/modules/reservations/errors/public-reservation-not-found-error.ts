export class PublicReservationNotFoundError extends Error {
  constructor() {
    super("Public reservation not found.");
    this.name = "PublicReservationNotFoundError";
  }
}