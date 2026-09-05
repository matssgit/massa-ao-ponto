import { z } from "zod";
import { ApiClient, ApiError } from "../../lib/api-client";

const timestampSchema = z.iso.datetime({ offset: true });
const roleSchema = z.enum(["OWNER", "STAFF"]);
const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
}).strict();
export const memberSchema = z.object({
  id: z.uuid(),
  user: z.object({ id: z.uuid(), email: z.email() }).strict(),
  role: roleSchema,
  active: z.boolean(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
}).strict();
export const invitationSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: roleSchema,
  createdAt: timestampSchema,
  expiresAt: timestampSchema,
  acceptedAt: timestampSchema.nullable(),
  revokedAt: timestampSchema.nullable(),
}).strict();
const membersPageSchema = z.object({ data: z.array(memberSchema), meta: paginationMetaSchema }).strict();
const invitationsPageSchema = z.object({ data: z.array(invitationSchema), meta: paginationMetaSchema }).strict();
const createdInvitationSchema = z.object({
  invitation: invitationSchema,
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
}).strict();
export const invitationEmailSchema = z.string().trim().toLowerCase().pipe(z.email("Informe um e-mail válido."));
export const newInvitationAcceptanceSchema = z.object({
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/, "Informe um token de convite válido."),
  password: z.string().min(12, "A senha deve ter pelo menos 12 caracteres.").max(1024),
  passwordConfirmation: z.string(),
}).refine((value) => value.password === value.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "As senhas não coincidem.",
});
export const existingInvitationAcceptanceSchema = z.object({
  token: z.string().trim().regex(/^[A-Za-z0-9_-]{43}$/, "Informe um token de convite válido."),
});

export type Member = z.infer<typeof memberSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type MembersPage = z.infer<typeof membersPageSchema>;
export type InvitationsPage = z.infer<typeof invitationsPageSchema>;
export type MembershipChanges = Partial<Pick<Member, "role" | "active">>;

function decode<T>(schema: z.ZodType<T>, payload: unknown, label: string): T {
  const result = schema.safeParse(payload);
  if (!result.success) throw new ApiError(200, "INVALID_RESPONSE", `A API retornou ${label} em formato inesperado.`);
  return result.data;
}

export class TeamService {
  constructor(private readonly client: ApiClient) {}

  private membersRoot(restaurantId: string) {
    return `/restaurants/${encodeURIComponent(restaurantId)}/members`;
  }

  private invitationsRoot(restaurantId: string) {
    return `/restaurants/${encodeURIComponent(restaurantId)}/member-invitations`;
  }

  async listMembers(restaurantId: string, page: number, limit = 20, signal?: AbortSignal): Promise<MembersPage> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    return decode(membersPageSchema, await this.client.request(`${this.membersRoot(restaurantId)}?${query}`, { signal }), "os membros");
  }

  async updateMember(restaurantId: string, membershipId: string, changes: MembershipChanges): Promise<Member> {
    return decode(memberSchema, await this.client.request(`${this.membersRoot(restaurantId)}/${encodeURIComponent(membershipId)}`, {
      method: "PATCH",
      body: changes,
    }), "um membro");
  }

  async listInvitations(restaurantId: string, page: number, limit = 20, signal?: AbortSignal): Promise<InvitationsPage> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    return decode(invitationsPageSchema, await this.client.request(`${this.invitationsRoot(restaurantId)}?${query}`, { signal }), "os convites");
  }

  async createInvitation(restaurantId: string, email: string) {
    return decode(createdInvitationSchema, await this.client.request(this.invitationsRoot(restaurantId), {
      method: "POST",
      body: { email: invitationEmailSchema.parse(email) },
    }), "um convite");
  }

  async revokeInvitation(restaurantId: string, invitationId: string): Promise<void> {
    await this.client.request(`${this.invitationsRoot(restaurantId)}/${encodeURIComponent(invitationId)}`, { method: "DELETE" });
  }

  async acceptNewUser(token: string, password: string): Promise<Member> {
    return decode(memberSchema, await this.client.request("/auth/member-invitations/accept", {
      method: "POST",
      body: { token, password },
      csrf: false,
    }), "um membro");
  }

  async acceptExistingUser(token: string): Promise<Member> {
    return decode(memberSchema, await this.client.request("/member-invitations/accept", {
      method: "POST",
      body: { token },
    }), "um membro");
  }
}