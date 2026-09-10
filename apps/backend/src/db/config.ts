import { z } from "zod";

const databaseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(30_000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().min(1_000).max(120_000).default(10_000),
  DB_READINESS_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(3_000),
});

function parseConnectionUrl(connectionString: string): URL {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }

  return url;
}

function assertProductionTls(url: URL, nodeEnvironment: string): void {
  if (nodeEnvironment !== "production") return;

  const verifiesServerIdentity =
    url.searchParams.get("sslmode") === "verify-full" ||
    url.searchParams.get("sslrootcert") === "system";

  if (!verifiesServerIdentity) {
    throw new Error(
      "Production DATABASE_URL must require certificate verification with sslmode=verify-full.",
    );
  }
}

export function readDatabaseConfig(environment: NodeJS.ProcessEnv = process.env) {
  const env = databaseEnvironmentSchema.parse(environment);
  const url = parseConnectionUrl(env.DATABASE_URL);
  assertProductionTls(url, env.NODE_ENV);

  return {
    connectionString: env.DATABASE_URL,
    poolMax: env.DB_POOL_MAX,
    idleTimeoutSeconds: env.DB_IDLE_TIMEOUT_MS / 1_000,
    connectionTimeoutSeconds: env.DB_CONNECTION_TIMEOUT_MS / 1_000,
    readinessTimeoutMs: env.DB_READINESS_TIMEOUT_MS,
  } as const;
}

export type DatabaseConfig = ReturnType<typeof readDatabaseConfig>;
