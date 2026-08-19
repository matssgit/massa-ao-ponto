export class TableNumberAlreadyExistsError extends Error {
  constructor() {
    super('Table number already exists in this restaurant.');
    this.name = 'TableNumberAlreadyExistsError';
  }
}