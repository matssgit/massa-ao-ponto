import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

const userSchema = z.object({ id: z.uuid(), email: z.string() });
const membershipSchema = z.object({
  restaurantId: z.uuid(),
  role: z.enum(["OWNER", "STAFF"]),
});
const sessionSchema = z.object({
  user: userSchema,
  memberships: z.array(membershipSchema),
  csrfToken: z.string().min(1),
});
const restaurantsSchema = z.array(z.object({ id: z.uuid(), name: z.string() }));
export type Session = z.infer<typeof sessionSchema>;
export type Membership = z.infer<typeof membershipSchema>;
export type RestaurantSummary = z.infer<typeof restaurantsSchema>[number];

function decode<T>(schema: z.ZodType<T>, payload: unknown): T {
  const result = schema.safeParse(payload);
  if (!result.success)
    throw new ApiError(
      200,
      "INVALID_RESPONSE",
      "A API retornou uma resposta inesperada.",
    );
  return result.data;
}

export class AuthService {
  constructor(readonly client: ApiClient) {}
  async session(): Promise<Session> {
    return decode(sessionSchema, await this.client.request("/auth/session"));
  }
  async login(email: string, password: string): Promise<void> {
    decode(
      z.object({ user: userSchema }),
      await this.client.request("/auth/login", {
        method: "POST",
        body: { email, password },
        csrf: false,
      }),
    );
  }
  async logout(): Promise<void> {
    await this.client.request("/auth/logout", { method: "POST" });
  }
  async restaurants(): Promise<RestaurantSummary[]> {
    return decode(restaurantsSchema, await this.client.request("/restaurants"));
  }
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return "Não foi possível concluir. Tente novamente.";
  if (error.status === 401) return "E-mail ou senha inválidos.";
  if (error.status === 429)
    return "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.";
  if (error.status === 403)
    return "A solicitação não foi autorizada. Atualize a sessão; se persistir, contate o administrador.";
  if (error.status >= 500)
    return "O serviço está indisponível no momento. Tente novamente.";
  return error.message;
}
