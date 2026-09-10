import { describe, expect, it } from "vitest";
import { readDatabaseConfig } from "./config.js";

const localUrl = "postgresql://user:password@localhost:5432/massa";
const secureUrl = "postgresql://user:password@database.example.com:5432/massa?sslmode=verify-full";

describe("readDatabaseConfig", () => {
  it("uses bounded development defaults without requiring TLS locally", () => {
    expect(readDatabaseConfig({ DATABASE_URL: localUrl })).toEqual({
      connectionString: localUrl,
      poolMax: 10,
      idleTimeoutSeconds: 30,
      connectionTimeoutSeconds: 10,
      readinessTimeoutMs: 3_000,
    });
  });

  it("accepts explicit pool and timeout configuration", () => {
    expect(readDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: secureUrl,
      DB_POOL_MAX: "20",
      DB_IDLE_TIMEOUT_MS: "45000",
      DB_CONNECTION_TIMEOUT_MS: "7000",
      DB_READINESS_TIMEOUT_MS: "2000",
    })).toMatchObject({
      poolMax: 20,
      idleTimeoutSeconds: 45,
      connectionTimeoutSeconds: 7,
      readinessTimeoutMs: 2_000,
    });
  });

  it.each([
    "postgresql://user:password@database.example.com:5432/massa",
    "postgresql://user:password@database.example.com:5432/massa?sslmode=disable",
    "postgresql://user:password@database.example.com:5432/massa?sslmode=prefer",
    "postgresql://user:password@database.example.com:5432/massa?sslmode=require",
  ])("rejects production connections without server identity verification (%#)", (databaseUrl) => {
    expect(() => readDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: databaseUrl,
    })).toThrow("sslmode=verify-full");
  });

  it("accepts the driver system-root shorthand in production", () => {
    expect(() => readDatabaseConfig({
      NODE_ENV: "production",
      DATABASE_URL: `${localUrl}?sslrootcert=system`,
    })).not.toThrow();
  });

  it.each([
    { DATABASE_URL: "" },
    { DATABASE_URL: "https://database.example.com/massa" },
    { DATABASE_URL: localUrl, DB_POOL_MAX: "0" },
    { DATABASE_URL: localUrl, DB_POOL_MAX: "101" },
    { DATABASE_URL: localUrl, DB_IDLE_TIMEOUT_MS: "999" },
    { DATABASE_URL: localUrl, DB_CONNECTION_TIMEOUT_MS: "121000" },
    { DATABASE_URL: localUrl, DB_READINESS_TIMEOUT_MS: "499" },
  ])("rejects invalid database configuration %#", (environment) => {
    expect(() => readDatabaseConfig(environment)).toThrow();
  });
});
