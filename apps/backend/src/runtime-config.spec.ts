import { describe, expect, it } from "vitest";
import { readRuntimeConfig } from "./runtime-config.js";

describe("readRuntimeConfig", () => {
  it("uses a local port default only in development and disables proxy trust", () => {
    expect(readRuntimeConfig({ NODE_ENV: "development" })).toEqual({
      host: "0.0.0.0",
      port: 3333,
      trustProxy: false,
    });
  });

  it("accepts an explicit port and a bounded proxy hop count", () => {
    expect(readRuntimeConfig({ NODE_ENV: "production", PORT: "8080", TRUST_PROXY_HOPS: "1" })).toEqual({
      host: "0.0.0.0",
      port: 8080,
      trustProxy: 1,
    });
  });

  it.each([
    { NODE_ENV: "production" },
    { NODE_ENV: "test" },
    { NODE_ENV: "production", PORT: "0" },
    { NODE_ENV: "production", PORT: "65536" },
    { NODE_ENV: "production", PORT: "invalid" },
    { NODE_ENV: "production", PORT: "3333", TRUST_PROXY_HOPS: "true" },
    { NODE_ENV: "production", PORT: "3333", TRUST_PROXY_HOPS: "11" },
  ])("rejects unsafe or invalid runtime configuration %#", (environment) => {
    expect(() => readRuntimeConfig(environment)).toThrow();
  });
});
