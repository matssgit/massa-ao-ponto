import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import type { AuthConfig } from "../modules/auth/auth-config.js";

export async function registerCors(app: FastifyInstance, config: AuthConfig): Promise<void> {
  await app.register(cors, {
    origin: [...config.allowedOrigins],
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Auth-Request", "X-CSRF-Token"],
    exposedHeaders: ["Retry-After"],
    strictPreflight: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
}
