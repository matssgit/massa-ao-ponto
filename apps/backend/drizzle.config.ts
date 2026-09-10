import "dotenv/config";

import { defineConfig } from "drizzle-kit";
import { readDatabaseConfig } from "./src/db/config.js";

const databaseConfig = readDatabaseConfig();

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseConfig.connectionString,
  },
  verbose: true,
  strict: true,
});
