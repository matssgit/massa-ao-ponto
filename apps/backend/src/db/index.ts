import "dotenv/config";

import * as schema from "./schema/index.js";

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

console.log("📦 Conexão com o banco de dados inicializada.");
