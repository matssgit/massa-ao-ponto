import { FastifyInstance } from "fastify";
import { createRestaurantController } from "../modules/restaurants/controllers/create-restaurant.js";
import { getRestaurantController } from "../modules/restaurants/controllers/get-restaurant.js";
import { listRestaurantsController } from "../modules/restaurants/controllers/list-restaurants.js";

export async function restaurantsRoutes(app: FastifyInstance) {
  app.post("/restaurants", createRestaurantController);
  app.get("/restaurants", listRestaurantsController);
  app.get("/restaurants/:restaurantId", getRestaurantController);
}
