import { createApplication } from "./app.js";
import { closeDatabase } from "./db/index.js";
import { createGracefulShutdown } from "./runtime.js";
import { readRuntimeConfig } from "./runtime-config.js";

const isTest = process.env.NODE_ENV === "test";
const runtimeConfig = isTest
  ? { host: "0.0.0.0" as const, port: 3333, trustProxy: false as const }
  : readRuntimeConfig();

export const app = createApplication({
  trustProxy: runtimeConfig.trustProxy,
  logger: !isTest,
});

if (!isTest) {
  const shutdown = createGracefulShutdown({ closeHttp: () => app.close(), closeDatabase });
  const handleSignal = (signal: NodeJS.Signals) => {
    app.log.info({ signal }, "Backend shutdown started.");
    void shutdown()
      .then(() => app.log.info({ signal }, "Backend shutdown completed."))
      .catch(() => {
        app.log.error({ signal }, "Backend shutdown failed.");
        process.exitCode = 1;
      });
  };

  process.once("SIGTERM", handleSignal);
  process.once("SIGINT", handleSignal);

  try {
    await app.listen({ port: runtimeConfig.port, host: runtimeConfig.host });
    app.log.info({ host: runtimeConfig.host, port: runtimeConfig.port }, "Backend started.");
  } catch {
    app.log.error("Backend startup failed.");
    await shutdown().catch(() => app.log.error("Backend cleanup after startup failure failed."));
    process.exitCode = 1;
  }
}
