import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { AddonNotFoundError } from "../modules/products/errors/addon-not-found-error.js";
import { AddonRestaurantMismatchError } from "../modules/products/errors/addon-restaurant-mismatch-error.js";
import { CapacityExceededError } from "../modules/reservations/errors/capacity-exceeded-error.js";
import { ProductNotFoundError as CatalogProductNotFoundError } from "../modules/products/errors/product-not-found-error.js";
import { CustomerNotFoundError } from "../modules/customers/errors/customer-not-found-error.js";
import { DeliveryAlreadyExistsError } from "../modules/orders/errors/delivery-already-exists-error.js";
import { DeliveryNotFoundError } from "../modules/orders/errors/delivery-not-found-error.js";
import { DuplicateProductInOrderError } from "../modules/orders/errors/duplicate-product-in-order-error.js";
import { InvalidDeliveryFeeError } from "../modules/orders/errors/invalid-delivery-fee-error.js";
import { InvalidCustomerPhoneError } from "../modules/customers/errors/invalid-customer-phone-error.js";
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
import { PaidOrderCannotBeCancelledError } from "../modules/orders/errors/paid-order-cannot-be-cancelled-error.js";
import { ProductAddonAlreadyExistsError } from "../modules/products/errors/product-addon-already-exists-error.js";
import { ProductAddonNotFoundError } from "../modules/products/errors/product-addon-not-found-error.js";
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
import { AuthRateLimitError, ForbiddenError, InvalidCredentialsError, InvalidCsrfError, UnauthenticatedError } from "../modules/auth/errors/auth-errors.js";
import {
  InvitationAlreadyPendingError,
  InvitationAlreadyUsedError,
  InvitationExpiredError,
  InvitationInvalidError,
  InvitationNotFoundError,
  InvitationRevokedError,
  LastActiveOwnerError,
  MemberAlreadyExistsError,
  MemberNotFoundError,
} from "../modules/auth/errors/membership-errors.js";

export const errorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      code: "VALIDATION_ERROR",
      message: "Validation error.",
      issues: error.issues,
    });
  }

  const sendDomainError = (statusCode: 400 | 401 | 403 | 404 | 409 | 429) =>
    reply.status(statusCode).send({
      code: error.name
        .replace(/Error$/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
        .toUpperCase(),
      message: error.message,
    });

  if (error instanceof InvalidCredentialsError || error instanceof UnauthenticatedError) {
    return sendDomainError(401);
  }
  if (error instanceof InvalidCsrfError || error instanceof ForbiddenError) return sendDomainError(403);
  if (error instanceof AuthRateLimitError) return sendDomainError(429);

  if (
    error instanceof RestaurantNotFoundError ||
    error instanceof MemberNotFoundError ||
    error instanceof InvitationNotFoundError ||
    error instanceof TableNotFoundError ||
    error instanceof ReservationNotFoundError ||
    error instanceof CustomerNotFoundError ||
    error instanceof ProductCategoryNotFoundError ||
    error instanceof ProductNotFoundError ||
    error instanceof CatalogProductNotFoundError ||
    error instanceof OrderNotFoundError ||
    error instanceof DeliveryNotFoundError ||
    error instanceof AddonNotFoundError ||
    error instanceof ProductAddonNotFoundError
  ) {
    return sendDomainError(404);
  }

  if (
    error instanceof TableRestaurantMismatchError ||
    error instanceof InvalidTimeRangeError ||
    error instanceof InvalidTimeRangeFilterError ||
    error instanceof InvalidItemQuantityError ||
    error instanceof InvalidDeliveryFeeError ||
    error instanceof MissingDeliveryAddressError ||
    error instanceof InvalidOrderTypeError ||
    error instanceof InvalidPeriodFilterError ||
    error instanceof InvalidCustomerPhoneError
  ) {
    return sendDomainError(400);
  }

  if (
    error instanceof TableNumberAlreadyExistsError ||
    error instanceof LastActiveOwnerError ||
    error instanceof MemberAlreadyExistsError ||
    error instanceof InvitationAlreadyPendingError ||
    error instanceof InvitationInvalidError ||
    error instanceof InvitationExpiredError ||
    error instanceof InvitationAlreadyUsedError ||
    error instanceof InvitationRevokedError ||
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
    error instanceof PaidOrderCannotBeCancelledError ||
    error instanceof DeliveryAlreadyExistsError ||
    error instanceof InvalidDeliveryOrderTypeError ||
    error instanceof InvalidDeliveryStatusTransitionError ||
    error instanceof TableOccupiedError ||
    error instanceof AddonRestaurantMismatchError ||
    error instanceof ProductAddonAlreadyExistsError
  ) {
    return sendDomainError(409);
  }

  if (request.routeOptions.url?.startsWith("/auth/")) {
    // Parser/DB errors may carry credentials or query parameters: never log their payload.
    if (error.statusCode === 400 || error.statusCode === 413 || error.statusCode === 415) {
      return reply.status(error.statusCode).send({
        code: "INVALID_AUTH_REQUEST",
        message: "Invalid authentication request.",
      });
    }
    console.error("Authentication request failed.");
  } else {
    console.error(error);
  }

  return reply.status(500).send({
    code: "INTERNAL_SERVER_ERROR",
    message: "Internal server error.",
  });
};
