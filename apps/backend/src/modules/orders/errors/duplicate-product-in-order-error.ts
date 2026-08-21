export class DuplicateProductInOrderError extends Error {
  constructor() {
    super(
      "Não é permitido adicionar o mesmo produto mais de uma vez no mesmo pedido.",
    );
    this.name = "DuplicateProductInOrderError";
  }
}
