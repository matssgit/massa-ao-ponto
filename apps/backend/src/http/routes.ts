import { FastifyInstance } from "fastify";
import { createReservationController } from "../modules/reservations/controllers/create-reservation.js";
import { createRestaurantController } from "../modules/restaurants/controllers/create-restaurant.js";
import { createTableController } from "../modules/tables/controllers/create-table.js";
import { getRestaurantController } from "../modules/restaurants/controllers/get-restaurant.js";
import { listRestaurantsController } from "../modules/restaurants/controllers/list-restaurants.js";
import { listTablesController } from "../modules/tables/controllers/list-tables.js";

export async function restaurantsRoutes(app: FastifyInstance) {
  app.post("/restaurants", createRestaurantController);
  app.get("/restaurants", listRestaurantsController);
  app.get("/restaurants/:restaurantId", getRestaurantController);
  app.post("/restaurants/:restaurantId/tables", createTableController);
  app.get("/restaurants/:restaurantId/tables", listTablesController);
  app.post(
    "/restaurants/:restaurantId/reservations",
    createReservationController,
  );
}
