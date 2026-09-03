import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      NODE_ENV: "test",
      AUTH_ALLOWED_ORIGINS: "http://localhost:5173",
      AUTH_COOKIE_SECURE: "false",
    },
  },
});
