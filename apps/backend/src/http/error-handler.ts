import { FastifyError, FastifyReply, FastifyRequest } from "fastify";

import { CapacityExceededError } from "../modules/reservations/errors/capacity-exceeded-error.js";
import { CustomerNotFoundError } from "../modules/customers/errors/customer-not-found-error.js";
import { InvalidReservationStatusTransitionError } from "../modules/reservations/errors/invalid-reservation-status-transition-error.js";
import { InvalidTimeRangeError } from "../modules/reservations/errors/invalid-time-range-error.js";
import { InvalidTimeRangeFilterError } from "../modules/reservations/errors/invalid-time-range-filter-error.js";
import { ReservationCancellationWindowExpiredError } from "../modules/reservations/errors/reservation-cancellation-window-expired-error.js";
import { ReservationConflictError } from "../modules/reservations/errors/reservation-conflict-error.js";
import { ReservationNotFoundError } from "../modules/reservations/errors/reservation-not-found-error.js";
import { RestaurantNotFoundError } from "../modules/restaurants/errors/restaurant-not-found-error.js";
import { TableInactiveError } from "../modules/reservations/errors/table-inactive-error.js";
import { TableNotFoundError } from "../modules/reservations/errors/table-not-found-error.js";
import { TableNumberAlreadyExistsError } from "../modules/tables/errors/table-number-already-exists-error.js";
import { TableRestaurantMismatchError } from "../modules/reservations/errors/table-restaurant-mismatch-error.js";
import { ZodError } from "zod";

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
    error instanceof CustomerNotFoundError
  ) {
    return reply.status(404).send({ message: error.message });
  }

  if (
    error instanceof TableRestaurantMismatchError ||
    error instanceof InvalidTimeRangeError ||
    error instanceof InvalidTimeRangeFilterError
  ) {
    return reply.status(400).send({ message: error.message });
  }

  if (
    error instanceof TableNumberAlreadyExistsError ||
    error instanceof ReservationConflictError ||
    error instanceof TableInactiveError ||
    error instanceof CapacityExceededError ||
    error instanceof InvalidReservationStatusTransitionError ||
    error instanceof ReservationCancellationWindowExpiredError
  ) {
    return reply.status(409).send({ message: error.message });
  }

  console.error(error);

  return reply.status(500).send({ message: "Internal server error." });
};
