export class AddonNotFoundError extends Error {
  constructor() {
    super("Adicional não encontrado.");
    this.name = "AddonNotFoundError";
  }
}
