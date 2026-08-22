export class TableOccupiedError extends Error {
  constructor() {
    super("A mesa selecionada já possui um pedido ativo em andamento.");
    this.name = "TableOccupiedError";
  }
}
