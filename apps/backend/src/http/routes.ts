import {
  completeDeliveryController,
  createDeliveryController,
  startDeliveryController,
} from "../modules/orders/controllers/delivery-controllers.js";

import { FastifyInstance } from "fastify";
import { cancelOrderController } from "../modules/orders/controllers/cancel-order.js";
import { cancelReservationController } from "../modules/reservations/controllers/cancel-reservation.js";
import { createOrderController } from "../modules/orders/controllers/create-order.js";
import { createProductCategoryController } from "../modules/products/controllers/create-product-category.js";
import { createProductController } from "../modules/products/controllers/create-product.js";
import { createReservationController } from "../modules/reservations/controllers/create-reservation.js";
import { createRestaurantController } from "../modules/restaurants/controllers/create-restaurant.js";
import { createTableController } from "../modules/tables/controllers/create-table.js";
import { getAvailabilityController } from "../modules/reservations/controllers/get-availability.js";
import { getCategoryPerformanceController } from "../modules/orders/controllers/get-category-performance.js";
import { getCustomerController } from "../modules/customers/controllers/get-customer.js";
import { getOrderController } from "../modules/orders/controllers/get-order.js";
import { getProductCategoryController } from "../modules/products/controllers/get-product-category.js";
import { getReservationController } from "../modules/reservations/controllers/get-reservation.js";
import { getRestaurantController } from "../modules/restaurants/controllers/get-restaurant.js";
import { getSalesSummaryController } from "../modules/orders/controllers/get-sales-summary.js";
import { getTopCustomersController } from "../modules/orders/controllers/get-top-customers.js";
import { getTopProductsController } from "../modules/orders/controllers/get-top-products.js";
import { listCustomerReservationsController } from "../modules/customers/controllers/list-customer-reservations.js";
import { listOrdersController } from "../modules/orders/controllers/list-orders.js";
import { listProductCategoriesController } from "../modules/products/controllers/list-product-category.js";
import { listProductsController } from "../modules/products/controllers/list-products.js";
import { listReservationHistoryController } from "../modules/reservations/controllers/list-reservation-history.js";
import { listReservationsController } from "../modules/reservations/controllers/list-reservations.js";
import { listRestaurantsController } from "../modules/restaurants/controllers/list-restaurants.js";
import { listTablesController } from "../modules/tables/controllers/list-tables.js";
import { payOrderController } from "../modules/orders/controllers/pay-order.js";
import { toggleProductCategoryStatusController } from "../modules/products/controllers/toggle-product-category-status.js";
import { toggleProductStatusController } from "../modules/products/controllers/toggle-product-status.js";
import { updateOrderStatusController } from "../modules/orders/controllers/update-order-status.js";
import { updateProductCategoryController } from "../modules/products/controllers/update-product-category.js";
import { updateProductController } from "../modules/products/controllers/update-product.js";
import { updateReservationStatusController } from "../modules/reservations/controllers/update-reservation-status.js";

export async function restaurantsRoutes(app: FastifyInstance) {
  // === RESTAURANTS ===
  app.post("/restaurants", createRestaurantController);
  app.get("/restaurants", listRestaurantsController);
  app.get("/restaurants/:restaurantId", getRestaurantController);

  // === TABLES ===
  app.post("/restaurants/:restaurantId/tables", createTableController);
  app.get("/restaurants/:restaurantId/tables", listTablesController);

  // === CATALOG ===
  app.post(
    "/restaurants/:restaurantId/product-categories",
    createProductCategoryController,
  );
  app.get(
    "/restaurants/:restaurantId/product-categories",
    listProductCategoriesController,
  );
  app.post("/restaurants/:restaurantId/products", createProductController);
  app.get("/restaurants/:restaurantId/products", listProductsController);
  app.patch(
    "/restaurants/:restaurantId/products/:productId",
    updateProductController,
  );
  app.patch(
    "/restaurants/:restaurantId/products/:productId/toggle-status",
    toggleProductStatusController,
  );
  app.get("/product-categories/:categoryId", getProductCategoryController);
  app.patch(
    "/restaurants/:restaurantId/product-categories/:categoryId",
    updateProductCategoryController,
  );
  app.patch(
    "/restaurants/:restaurantId/product-categories/:categoryId/toggle-status",
    toggleProductCategoryStatusController,
  );

  // === CUSTOMERS ===
  app.get("/customers/:customerId", getCustomerController);
  app.get(
    "/customers/:customerId/reservations",
    listCustomerReservationsController,
  );

  // === RESERVATIONS ===
  app.post(
    "/restaurants/:restaurantId/reservations",
    createReservationController,
  );
  app.get(
    "/restaurants/:restaurantId/reservations",
    listReservationsController,
  );
  app.get("/restaurants/:restaurantId/availability", getAvailabilityController);
  app.get("/reservations/:reservationId", getReservationController);
  app.get(
    "/reservations/:reservationId/history",
    listReservationHistoryController,
  );
  app.patch(
    "/reservations/:reservationId/status",
    updateReservationStatusController,
  );
  app.patch("/reservations/:reservationId/cancel", cancelReservationController);

  // === ORDERS ===
  app.post("/restaurants/:restaurantId/orders", createOrderController);
  app.get("/restaurants/:restaurantId/orders", listOrdersController);
  app.get("/orders/:orderId", getOrderController); // Consulta global individual
  app.patch("/orders/:orderId/status", updateOrderStatusController);
  app.patch("/orders/:orderId/cancel", cancelOrderController);
  app.patch("/orders/:orderId/payment", payOrderController);
  app.post("/orders/:orderId/delivery", createDeliveryController);
  app.patch("/orders/:orderId/delivery/start", startDeliveryController);
  app.patch("/orders/:orderId/delivery/complete", completeDeliveryController);
  app.get(
    "/restaurants/:restaurantId/dashboard/sales-summary",
    getSalesSummaryController,
  );
  app.get(
    "/restaurants/:restaurantId/dashboard/top-products",
    getTopProductsController,
  );
  app.get(
    "/restaurants/:restaurantId/dashboard/category-performance",
    getCategoryPerformanceController,
  );
  app.get(
    "/restaurants/:restaurantId/dashboard/top-customers",
    getTopCustomersController,
  );
}
