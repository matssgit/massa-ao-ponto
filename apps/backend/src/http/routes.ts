import { FastifyInstance } from "fastify";
import { cancelReservationController } from "../modules/reservations/controllers/cancel-reservation.js";
import { createReservationController } from "../modules/reservations/controllers/create-reservation.js";
import { createRestaurantController } from "../modules/restaurants/controllers/create-restaurant.js";
import { createTableController } from "../modules/tables/controllers/create-table.js";
import { getAvailabilityController } from "../modules/reservations/controllers/get-availability.js";
import { getCustomerController } from "../modules/customers/controllers/get-customer.js";
import { getReservationController } from "../modules/reservations/controllers/get-reservation.js";
import { getRestaurantController } from "../modules/restaurants/controllers/get-restaurant.js";
import { listCustomerReservationsController } from "../modules/customers/controllers/list-customer-reservations.js";
import { listReservationHistoryController } from "../modules/reservations/controllers/list-reservation-history.js";
import { listReservationsController } from "../modules/reservations/controllers/list-reservations.js";
import { listRestaurantsController } from "../modules/restaurants/controllers/list-restaurants.js";
import { listTablesController } from "../modules/tables/controllers/list-tables.js";
import { updateReservationStatusController } from "../modules/reservations/controllers/update-reservation-status.js";

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
  app.patch(
    "/reservations/:reservationId/status",
    updateReservationStatusController,
  );
  app.get(
    "/restaurants/:restaurantId/reservations",
    listReservationsController,
  );
  app.get("/restaurants/:restaurantId/availability", getAvailabilityController);
  app.patch("/reservations/:reservationId/cancel", cancelReservationController);
  app.get("/reservations/:reservationId", getReservationController);
  app.get(
    "/reservations/:reservationId/history",
    listReservationHistoryController,
  );

  app.get("/customers/:customerId", getCustomerController);
  app.get(
    "/customers/:customerId/reservations",
    listCustomerReservationsController,
  );
}
