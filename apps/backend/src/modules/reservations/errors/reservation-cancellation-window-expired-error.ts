export class ReservationCancellationWindowExpiredError extends Error {
  constructor() {
    super(
      "A reserva só pode ser cancelada com no mínimo 2 horas de antecedência.",
    );
    this.name = "ReservationCancellationWindowExpiredError";
  }
}
