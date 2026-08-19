export class ReservationNotFoundError extends Error {
  constructor() {
    super("A reserva informada não foi encontrada.");
    this.name = "ReservationNotFoundError";
  }
}
