import { errorHandler } from "./http/error-handler.js";
import fastify from "fastify";
import cookie from "@fastify/cookie";
import { registerCors } from "./http/cors.js";
import { readAuthConfig } from "./modules/auth/auth-config.js";
import { registerAuthorization } from "./modules/auth/authorization.js";
import { authRoutes } from "./modules/auth/routes.js";
import { restaurantsRoutes } from "./http/routes.js";

export const app = fastify();

app.setErrorHandler(errorHandler);
app.register(async (scope) => {
  await registerCors(scope, readAuthConfig());
  await scope.register(cookie);
  registerAuthorization(scope);
  scope.register(authRoutes);
  scope.register(restaurantsRoutes);
});

if (process.env.NODE_ENV !== "test") {
  app.listen({ port: 3333, host: "0.0.0.0" }).then(() => {
    console.log("HTTP Server Running!");
  });
}
