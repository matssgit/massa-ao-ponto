export class TableInactiveError extends Error {
  constructor() {
    super("A mesa selecionada está inativa e não pode receber reservas.");
    this.name = "TableInactiveError";
  }
}
