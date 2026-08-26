export class AddonInactiveError extends Error {
  constructor() {
    super("O adicional selecionado está inativo.");
    this.name = "AddonInactiveError";
  }
}
