import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { readAuthConfig } from "../auth/auth-config.js";
import {
  cancelPublicReservationController,
  createPublicReservationController,
  getPublicAvailabilityController,
  getPublicReservationController,
  getPublicRestaurantController,
} from "./controllers/public-reservation-controllers.js";
import { PublicRateLimitError } from "./public-rate-limit-error.js";
import { getPublicCatalogController } from "../public-catalog/controllers/get-public-catalog.js";
import {
  cancelPublicOrderController,
  createPublicOrderController,
  getPublicOrderController,
} from "../public-orders/controllers/public-order-controllers.js";

export async function publicReservationRoutes(app: FastifyInstance) {
  const config = readAuthConfig();
  await app.register(rateLimit, {
    global: false,
    hook: "onRequest",
    continueExceeding: false,
    skipOnError: false,
    errorResponseBuilder: () => new PublicRateLimitError(),
  });

  app.get("/public/restaurants/:slug", { config: { access: "public" } }, getPublicRestaurantController);
  app.get("/public/restaurants/:slug/catalog", { config: { access: "public" } }, getPublicCatalogController);
  app.post("/public/restaurants/:slug/orders", {
    bodyLimit: 16384,
    config: { access: "public", rateLimit: config.publicOrderRateLimits.create },
  }, createPublicOrderController);
  app.get("/public/orders/:token", {
    config: { access: "public", rateLimit: config.publicOrderRateLimits.lookup },
  }, getPublicOrderController);
  app.post("/public/orders/:token/cancel", {
    bodyLimit: 1024,
    config: { access: "public", rateLimit: config.publicOrderRateLimits.cancel },
  }, cancelPublicOrderController);
  app.get("/public/restaurants/:slug/reservations/availability", {
    config: { access: "public", rateLimit: config.publicReservationRateLimits.availability },
  }, getPublicAvailabilityController);
  app.post("/public/restaurants/:slug/reservations", {
    bodyLimit: 8192,
    config: { access: "public", rateLimit: config.publicReservationRateLimits.create },
  }, createPublicReservationController);
  app.get("/public/reservations/:token", {
    config: { access: "public", rateLimit: config.publicReservationRateLimits.access },
  }, getPublicReservationController);
  app.post("/public/reservations/:token/cancel", {
    bodyLimit: 1024,
    config: { access: "public", rateLimit: config.publicReservationRateLimits.access },
  }, cancelPublicReservationController);
}
