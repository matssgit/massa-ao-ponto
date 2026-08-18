import { errorHandler } from "./http/error-handler.js";
import fastify from "fastify";
import { restaurantsRoutes } from "./http/routes.js";

export const app = fastify();

app.setErrorHandler(errorHandler);
app.register(restaurantsRoutes);

// Evitamos chamar o listen() ao rodar os testes
if (process.env.NODE_ENV !== "test") {
  app.listen({ port: 3333, host: "0.0.0.0" }).then(() => {
    console.log("HTTP Server Running!");
  });
}
