export class CapacityExceededError extends Error {
  constructor() {
    super("A quantidade de pessoas excede a capacidade máxima da mesa.");
    this.name = "CapacityExceededError";
  }
}
