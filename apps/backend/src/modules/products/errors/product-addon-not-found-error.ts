export class ProductAddonNotFoundError extends Error {
  constructor() {
    super("A associação entre este produto e o adicional não existe.");
    this.name = "ProductAddonNotFoundError";
  }
}
