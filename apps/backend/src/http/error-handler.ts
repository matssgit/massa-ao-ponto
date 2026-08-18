import { FastifyInstance } from "fastify";
import { RestaurantNotFoundError } from "../modules/restaurants/errors/restaurant-not-found-error.js";
import { ZodError } from "zod";

type FastifyErrorHandler = FastifyInstance["errorHandler"];

export const errorHandler: FastifyErrorHandler = (error, request, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation error.",
      issues: error.format(),
    });
  }

  if (error instanceof RestaurantNotFoundError) {
    return reply.status(404).send({ message: error.message });
  }

  console.error(error);

  return reply.status(500).send({ message: "Internal server error." });
};
