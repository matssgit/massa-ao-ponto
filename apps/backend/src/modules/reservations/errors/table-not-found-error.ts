export class TableNotFoundError extends Error {
  constructor() {
    super("A mesa informada não foi encontrada.");
    this.name = "TableNotFoundError";
  }
}
