export class InvalidPeriodFilterError extends Error {
  constructor() {
    super('A data de início deve ser anterior ou igual à data de fim.');
    this.name = 'InvalidPeriodFilterError';
  }
}