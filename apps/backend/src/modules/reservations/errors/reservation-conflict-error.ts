export class ReservationConflictError extends Error {
  constructor() {
    super("A mesa já possui uma reserva ativa para o período solicitado.");
    this.name = "ReservationConflictError";
  }
}
