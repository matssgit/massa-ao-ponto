import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthConfig } from "../auth-config.js";
import { loginBodySchema } from "../schemas/auth.schema.js";
import type { LoginUseCase } from "../use-cases/login.use-case.js";
import type { GetSessionUseCase } from "../use-cases/get-session.use-case.js";
import type { LogoutUseCase } from "../use-cases/logout.use-case.js";

export function createAuthControllers(
  config: AuthConfig,
  login: LoginUseCase,
  getSession: GetSessionUseCase,
  logout: LogoutUseCase,
) {
  return {
    async login(request: FastifyRequest, reply: FastifyReply) {
      const result = await login.execute(loginBodySchema.parse(request.body));
      reply.setCookie(config.cookieName, result.token, {
        ...config.cookieOptions,
        expires: result.expiresAt,
      });
      return reply.status(200).send({ user: result.user });
    },

    async session(request: FastifyRequest, reply: FastifyReply) {
      const result = await getSession.execute(request.cookies[config.cookieName]);
      return reply.status(200).send(result);
    },

    async logout(request: FastifyRequest, reply: FastifyReply) {
      const header = request.headers["x-csrf-token"];
      await logout.execute(
        request.cookies[config.cookieName],
        typeof header === "string" ? header : undefined,
      );
      reply.clearCookie(config.cookieName, config.cookieOptions);
      return reply.status(204).send();
    },
  };
}
