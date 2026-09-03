import {
  completeDeliveryController,
  createDeliveryController,
  startDeliveryController,
} from "../modules/orders/controllers/delivery-controllers.js";

import { FastifyInstance } from "fastify";
import { addAddonToProductController } from "../modules/products/controllers/add-addon-to-product.js";
import { cancelOrderController } from "../modules/orders/controllers/cancel-order.js";
import { cancelReservationController } from "../modules/reservations/controllers/cancel-reservation.js";
import { createAddonController } from "../modules/products/controllers/create-addon.js";
import { createOrderController } from "../modules/orders/controllers/create-order.js";
import { createProductCategoryController } from "../modules/products/controllers/create-product-category.js";
import { createProductController } from "../modules/products/controllers/create-product.js";
import { createReservationController } from "../modules/reservations/controllers/create-reservation.js";
import { ForbiddenError } from "../modules/auth/errors/auth-errors.js";
import { createTableController } from "../modules/tables/controllers/create-table.js";
import { deleteAddonController } from "../modules/products/controllers/delete-addon.js";
import { deleteProductCategoryController } from "../modules/products/controllers/delete-product-category.js";
import { deleteProductController } from "../modules/products/controllers/delete-product.js";
import { getAddonController } from "../modules/products/controllers/get-addon.js";
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
import { listAddonsController } from "../modules/products/controllers/list-addons.js";
import { listCustomerReservationsController } from "../modules/customers/controllers/list-customer-reservations.js";
import { listCustomersController } from "../modules/customers/controllers/list-customers.js";
import { listOrdersController } from "../modules/orders/controllers/list-orders.js";
import { listProductAddonsController } from "../modules/products/controllers/list-product-addons.js";
import { listProductCategoriesController } from "../modules/products/controllers/list-product-category.js";
import { listProductsController } from "../modules/products/controllers/list-products.js";
import { listReservationHistoryController } from "../modules/reservations/controllers/list-reservation-history.js";
import { listReservationsController } from "../modules/reservations/controllers/list-reservations.js";
import { listRestaurantsController } from "../modules/restaurants/controllers/list-restaurants.js";
import { listTablesController } from "../modules/tables/controllers/list-tables.js";
import { payOrderController } from "../modules/orders/controllers/pay-order.js";
import { removeAddonFromProductController } from "../modules/products/controllers/remove-addon-from-product.js";
import { toggleAddonStatusController } from "../modules/products/controllers/toggle-addon-status.js";
import { toggleProductCategoryStatusController } from "../modules/products/controllers/toggle-product-category-status.js";
import { toggleProductStatusController } from "../modules/products/controllers/toggle-product-status.js";
import { updateAddonController } from "../modules/products/controllers/update-addon.js";
import { updateOrderStatusController } from "../modules/orders/controllers/update-order-status.js";
import { updateProductCategoryController } from "../modules/products/controllers/update-product-category.js";
import { updateProductController } from "../modules/products/controllers/update-product.js";
import { updateReservationStatusController } from "../modules/reservations/controllers/update-reservation-status.js";
import { updateRestaurantController } from "../modules/restaurants/controllers/update-restaurant.js";
import { updateTableController } from "../modules/tables/controllers/update-table.js";

export async function restaurantsRoutes(app: FastifyInstance) {
  // === RESTAURANTS ===
  app.post(
    "/restaurants",
    { config: { access: "disabled" } },
    async () => { throw new ForbiddenError(); },
  );
  app.get(
    "/restaurants",
    { config: { access: "user" } },
    listRestaurantsController,
  );
  app.get(
    "/restaurants/:restaurantId",
    { config: { access: "tenant" } },
    getRestaurantController,
  );
  app.patch(
    "/restaurants/:restaurantId",
    { config: { access: "owner" } },
    updateRestaurantController,
  );

  // === TABLES ===
  app.post(
    "/restaurants/:restaurantId/tables",
    { config: { access: "owner" } },
    createTableController,
  );
  app.get(
    "/restaurants/:restaurantId/tables",
    { config: { access: "tenant" } },
    listTablesController,
  );
  app.patch(
    "/restaurants/:restaurantId/tables/:tableId",
    { config: { access: "owner" } },
    updateTableController,
  );

  // === CATALOG ===
  app.post(
    "/restaurants/:restaurantId/product-categories",
    { config: { access: "owner" } },
    createProductCategoryController,
  );
  app.get(
    "/restaurants/:restaurantId/product-categories",
    { config: { access: "tenant" } },
    listProductCategoriesController,
  );
  app.post(
    "/restaurants/:restaurantId/products",
    { config: { access: "owner" } },
    createProductController,
  );
  app.get(
    "/restaurants/:restaurantId/products",
    { config: { access: "tenant" } },
    listProductsController,
  );
  app.patch(
    "/restaurants/:restaurantId/products/:productId",
    { config: { access: "owner" } },
    updateProductController,
  );
  app.patch(
    "/restaurants/:restaurantId/products/:productId/toggle-status",
    { config: { access: "owner" } },
    toggleProductStatusController,
  );
  app.get(
    "/restaurants/:restaurantId/product-categories/:categoryId",
    { config: { access: "tenant" } },
    getProductCategoryController,
  );
  app.patch(
    "/restaurants/:restaurantId/product-categories/:categoryId",
    { config: { access: "owner" } },
    updateProductCategoryController,
  );
  app.patch(
    "/restaurants/:restaurantId/product-categories/:categoryId/toggle-status",
    { config: { access: "owner" } },
    toggleProductCategoryStatusController,
  );
  app.delete(
    "/restaurants/:restaurantId/product-categories/:categoryId",
    { config: { access: "owner" } },
    deleteProductCategoryController,
  );
  app.delete(
    "/restaurants/:restaurantId/products/:productId",
    { config: { access: "owner" } },
    deleteProductController,
  );

  // === ADDONS ===
  app.post(
    "/restaurants/:restaurantId/addons",
    { config: { access: "owner" } },
    createAddonController,
  );
  app.get(
    "/restaurants/:restaurantId/addons",
    { config: { access: "tenant" } },
    listAddonsController,
  );
  app.get(
    "/restaurants/:restaurantId/addons/:addonId",
    { config: { access: "tenant" } },
    getAddonController,
  );
  app.patch(
    "/restaurants/:restaurantId/addons/:addonId",
    { config: { access: "owner" } },
    updateAddonController,
  );
  app.patch(
    "/restaurants/:restaurantId/addons/:addonId/toggle-status",
    { config: { access: "owner" } },
    toggleAddonStatusController,
  );
  app.delete(
    "/restaurants/:restaurantId/addons/:addonId",
    { config: { access: "owner" } },
    deleteAddonController,
  );

  // === PRODUCT ADDONS ASSOCIATION ===
  app.post(
    "/restaurants/:restaurantId/products/:productId/addons/:addonId",
    { config: { access: "owner" } },
    addAddonToProductController,
  );
  app.delete(
    "/restaurants/:restaurantId/products/:productId/addons/:addonId",
    { config: { access: "owner" } },
    removeAddonFromProductController,
  );
  app.get(
    "/restaurants/:restaurantId/products/:productId/addons",
    { config: { access: "tenant" } },
    listProductAddonsController,
  );

  // === CUSTOMERS ===
  app.get(
    "/restaurants/:restaurantId/customers",
    { config: { access: "tenant" } },
    listCustomersController,
  );
  app.get(
    "/restaurants/:restaurantId/customers/:customerId",
    { config: { access: "tenant" } },
    getCustomerController,
  );
  app.get(
    "/restaurants/:restaurantId/customers/:customerId/reservations",
    { config: { access: "tenant" } },
    listCustomerReservationsController,
  );

  // === RESERVATIONS ===
  app.post(
    "/restaurants/:restaurantId/reservations",
    { config: { access: "tenant" } },
    createReservationController,
  );
  app.get(
    "/restaurants/:restaurantId/reservations",
    { config: { access: "tenant" } },
    listReservationsController,
  );
  app.get(
    "/restaurants/:restaurantId/availability",
    { config: { access: "tenant" } },
    getAvailabilityController,
  );
  app.get(
    "/restaurants/:restaurantId/reservations/:reservationId",
    { config: { access: "tenant" } },
    getReservationController,
  );
  app.get(
    "/restaurants/:restaurantId/reservations/:reservationId/history",
    { config: { access: "tenant" } },
    listReservationHistoryController,
  );
  app.patch(
    "/restaurants/:restaurantId/reservations/:reservationId/status",
    { config: { access: "tenant" } },
    updateReservationStatusController,
  );
  app.patch(
    "/restaurants/:restaurantId/reservations/:reservationId/cancel",
    { config: { access: "tenant" } },
    cancelReservationController,
  );

  // === ORDERS ===
  app.post(
    "/restaurants/:restaurantId/orders",
    { config: { access: "tenant" } },
    createOrderController,
  );
  app.get(
    "/restaurants/:restaurantId/orders",
    { config: { access: "tenant" } },
    listOrdersController,
  );
  app.get(
    "/restaurants/:restaurantId/orders/:orderId",
    { config: { access: "tenant" } },
    getOrderController,
  );
  app.patch(
    "/restaurants/:restaurantId/orders/:orderId/status",
    { config: { access: "tenant" } },
    updateOrderStatusController,
  );
  app.patch(
    "/restaurants/:restaurantId/orders/:orderId/cancel",
    { config: { access: "tenant" } },
    cancelOrderController,
  );
  app.patch(
    "/restaurants/:restaurantId/orders/:orderId/payment",
    { config: { access: "owner" } },
    payOrderController,
  );
  app.post(
    "/restaurants/:restaurantId/orders/:orderId/delivery",
    { config: { access: "tenant" } },
    createDeliveryController,
  );
  app.patch(
    "/restaurants/:restaurantId/orders/:orderId/delivery/start",
    { config: { access: "tenant" } },
    startDeliveryController,
  );
  app.patch(
    "/restaurants/:restaurantId/orders/:orderId/delivery/complete",
    { config: { access: "tenant" } },
    completeDeliveryController,
  );
  app.get(
    "/restaurants/:restaurantId/dashboard/sales-summary",
    { config: { access: "owner" } },
    getSalesSummaryController,
  );
  app.get(
    "/restaurants/:restaurantId/dashboard/top-products",
    { config: { access: "owner" } },
    getTopProductsController,
  );
  app.get(
    "/restaurants/:restaurantId/dashboard/category-performance",
    { config: { access: "owner" } },
    getCategoryPerformanceController,
  );
  app.get(
    "/restaurants/:restaurantId/dashboard/top-customers",
    { config: { access: "owner" } },
    getTopCustomersController,
  );
}
