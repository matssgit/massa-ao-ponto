export class ProductInactiveError extends Error {
  constructor() {
    super("O produto selecionado está inativo.");
    this.name = "ProductInactiveError";
  }
}
