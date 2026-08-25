export class ProductHasOrdersError extends Error {
  constructor() {
    super(
      "Não é possível excluir um produto que já foi registrado em um pedido.",
    );
    this.name = "ProductHasOrdersError";
  }
}
