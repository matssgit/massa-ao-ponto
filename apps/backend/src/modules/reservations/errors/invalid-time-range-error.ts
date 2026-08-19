export class InvalidTimeRangeError extends Error {
  constructor() {
    super(
      "O horário de término da reserva deve ser posterior ao horário de início.",
    );
    this.name = "InvalidTimeRangeError";
  }
}
