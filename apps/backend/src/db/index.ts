import "dotenv/config";

import * as schema from "./schema/index.js";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readDatabaseConfig } from "./config.js";
import { waitForDatabaseQuery } from "./readiness.js";

const config = readDatabaseConfig();
const client = postgres(config.connectionString, {
  prepare: false,
  max: config.poolMax,
  idle_timeout: config.idleTimeoutSeconds,
  connect_timeout: config.connectionTimeoutSeconds,
});

export const db = drizzle(client, { schema });
export * from "./schema/index.js";
export * from "./schema/tables.js";

export async function checkDatabaseConnection(): Promise<void> {
  const query = client`select 1`.execute();
  await waitForDatabaseQuery(query, config.readinessTimeoutMs);
}

export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}
