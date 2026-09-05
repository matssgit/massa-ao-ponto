import type { AuthMembership } from "./repositories/auth-repository.js";

export interface AuthContext {
  userId: string;
  restaurantId: string;
  role: AuthMembership["role"];
}

export type RouteAccess = "public" | "auth-runtime" | "user" | "tenant" | "owner" | "disabled";

declare module "fastify" {
  interface FastifyRequest {
    authenticatedUserId: string | null;
    authContext: AuthContext | null;
  }
  interface FastifyContextConfig {
    access?: RouteAccess;
  }
}
