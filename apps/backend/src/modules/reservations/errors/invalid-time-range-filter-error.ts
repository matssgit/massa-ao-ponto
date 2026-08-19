export class InvalidTimeRangeFilterError extends Error {
  constructor() {
    super(
      "O horário de início do filtro não pode ser posterior ao horário de término.",
    );
    this.name = "InvalidTimeRangeFilterError";
  }
}
