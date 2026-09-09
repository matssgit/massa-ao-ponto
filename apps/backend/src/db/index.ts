import "dotenv/config";

import * as schema from "./schema/index.js";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não foi encontrada no .env");
}

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export * from "./schema/index.js";
export * from "./schema/tables.js";

export async function checkDatabaseConnection(): Promise<void> {
  await db.execute(sql`select 1`);
}

export async function closeDatabase(): Promise<void> {
  await client.end({ timeout: 5 });
}
