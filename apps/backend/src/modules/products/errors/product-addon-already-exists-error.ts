export class ProductAddonAlreadyExistsError extends Error {
  constructor() {
    super("Este adicional já está associado a este produto.");
    this.name = "ProductAddonAlreadyExistsError";
  }
}
