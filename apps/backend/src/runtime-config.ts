import { z } from "zod";
import { logLevels } from "./http/observability.js";

const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
  LOG_LEVEL: z.enum(logLevels).optional(),
});

export function readRuntimeConfig(environment: NodeJS.ProcessEnv = process.env) {
  const env = runtimeEnvironmentSchema.parse(environment);
  if (env.PORT === undefined && env.NODE_ENV !== "development") {
    throw new Error("PORT is required outside development.");
  }

  return {
    host: "0.0.0.0",
    port: env.PORT ?? 3333,
    trustProxy: env.TRUST_PROXY_HOPS === 0 ? false : env.TRUST_PROXY_HOPS,
    logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === "production" ? "info" : "debug"),
  } as const;
}

export type RuntimeConfig = ReturnType<typeof readRuntimeConfig>;
