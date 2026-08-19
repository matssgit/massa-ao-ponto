export class TableRestaurantMismatchError extends Error {
  constructor() {
    super("A mesa selecionada não pertence ao restaurante informado.");
    this.name = "TableRestaurantMismatchError";
  }
}
