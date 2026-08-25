import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { CapacityExceededError } from "../modules/reservations/errors/capacity-exceeded-error.js";
import { ProductNotFoundError as CatalogProductNotFoundError } from "../modules/products/errors/product-not-found-error.js";
import { CustomerNotFoundError } from "../modules/customers/errors/customer-not-found-error.js";
import { DeliveryAlreadyExistsError } from "../modules/orders/errors/delivery-already-exists-error.js";
import { DeliveryNotFoundError } from "../modules/orders/errors/delivery-not-found-error.js";
import { DuplicateProductInOrderError } from "../modules/orders/errors/duplicate-product-in-order-error.js";
import { InvalidDeliveryFeeError } from "../modules/orders/errors/invalid-delivery-fee-error.js";
import { InvalidDeliveryOrderTypeError } from "../modules/orders/errors/invalid-delivery-order-type-error.js";
import { InvalidDeliveryStatusTransitionError } from "../modules/orders/errors/invalid-delivery-status-transition-error.js";
import { InvalidItemQuantityError } from "../modules/orders/errors/invalid-item-quantity-error.js";
import { InvalidOrderPaymentTransitionError } from "../modules/orders/errors/invalid-order-payment-transition-error.js";
import { InvalidOrderStatusTransitionError } from "../modules/orders/errors/invalid-order-status-transition-error.js";
import { InvalidOrderTypeError } from "../modules/orders/errors/invalid-order-type-error.js";
import { InvalidPeriodFilterError } from "../modules/orders/errors/invalid-period-filter-error.js";
import { InvalidReservationStatusTransitionError } from "../modules/reservations/errors/invalid-reservation-status-transition-error.js";
import { InvalidTimeRangeError } from "../modules/reservations/errors/invalid-time-range-error.js";
import { InvalidTimeRangeFilterError } from "../modules/reservations/errors/invalid-time-range-filter-error.js";
import { MissingDeliveryAddressError } from "../modules/orders/errors/missing-delivery-address-error.js";
import { OrderNotFoundError } from "../modules/orders/errors/order-not-found-error.js";
import { ProductCategoryHasProductsError } from "../modules/products/errors/product-category-has-products-error.js";
import { ProductCategoryNotFoundError } from "../modules/products/errors/product-category-not-found-error.js";
import { ProductCategoryRestaurantMismatchError } from "../modules/products/errors/product-category-restaurant-mismatch-error.js";
import { ProductHasOrdersError } from "../modules/products/errors/product-has-orders-error.js";
import { ProductInactiveError } from "../modules/orders/errors/product-inactive-error.js";
import { ProductNotFoundError } from "../modules/orders/errors/product-not-found-error.js";
import { ProductRestaurantMismatchError } from "../modules/orders/errors/product-restaurant-mismatch-error.js";
import { ReservationCancellationWindowExpiredError } from "../modules/reservations/errors/reservation-cancellation-window-expired-error.js";
import { ReservationConflictError } from "../modules/reservations/errors/reservation-conflict-error.js";
import { ReservationNotFoundError } from "../modules/reservations/errors/reservation-not-found-error.js";
import { RestaurantNotFoundError } from "../modules/restaurants/errors/restaurant-not-found-error.js";
import { TableInactiveError } from "../modules/reservations/errors/table-inactive-error.js";
import { TableNotFoundError } from "../modules/reservations/errors/table-not-found-error.js";
import { TableNumberAlreadyExistsError } from "../modules/tables/errors/table-number-already-exists-error.js";
import { TableOccupiedError } from "../modules/orders/errors/table-occupied-error.js";
import { TableRestaurantMismatchError } from "../modules/reservations/errors/table-restaurant-mismatch-error.js";
import { ZodError } from "zod";

// Novos Erros de Catálogo

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation error.",
      issues: error.format(),
    });
  }

  if (
    error instanceof RestaurantNotFoundError ||
    error instanceof TableNotFoundError ||
    error instanceof ReservationNotFoundError ||
    error instanceof CustomerNotFoundError ||
    error instanceof ProductCategoryNotFoundError ||
    error instanceof ProductNotFoundError ||
    error instanceof CatalogProductNotFoundError ||
    error instanceof OrderNotFoundError ||
    error instanceof DeliveryNotFoundError
  ) {
    return reply.status(404).send({ message: error.message });
  }

  if (
    error instanceof TableRestaurantMismatchError ||
    error instanceof InvalidTimeRangeError ||
    error instanceof InvalidTimeRangeFilterError ||
    error instanceof InvalidItemQuantityError ||
    error instanceof InvalidDeliveryFeeError ||
    error instanceof MissingDeliveryAddressError ||
    error instanceof InvalidOrderTypeError ||
    error instanceof InvalidPeriodFilterError
  ) {
    return reply.status(400).send({ message: error.message });
  }

  if (
    error instanceof TableNumberAlreadyExistsError ||
    error instanceof ReservationConflictError ||
    error instanceof TableInactiveError ||
    error instanceof CapacityExceededError ||
    error instanceof InvalidReservationStatusTransitionError ||
    error instanceof ReservationCancellationWindowExpiredError ||
    error instanceof ProductCategoryRestaurantMismatchError ||
    error instanceof ProductCategoryHasProductsError ||
    error instanceof ProductHasOrdersError ||
    error instanceof DuplicateProductInOrderError ||
    error instanceof ProductInactiveError ||
    error instanceof ProductRestaurantMismatchError ||
    error instanceof InvalidOrderStatusTransitionError ||
    error instanceof InvalidOrderPaymentTransitionError ||
    error instanceof DeliveryAlreadyExistsError ||
    error instanceof InvalidDeliveryOrderTypeError ||
    error instanceof InvalidDeliveryStatusTransitionError ||
    error instanceof TableOccupiedError
  ) {
    return reply.status(409).send({ message: error.message });
  }

  console.error(error);

  return reply.status(500).send({ message: "Internal server error." });
};
