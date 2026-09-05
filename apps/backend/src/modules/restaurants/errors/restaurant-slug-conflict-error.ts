export class RestaurantSlugConflictError extends Error {
  constructor() {
    super("Restaurant slug is already in use.");
    this.name = "RestaurantSlugConflictError";
  }
}