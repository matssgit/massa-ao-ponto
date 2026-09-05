import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../app/app";
import { ApiClient } from "../../lib/api-client";
import { AuthService, type Membership, type Session } from "../auth/auth-service";
import type { Invitation, Member } from "./team-service";

const restaurantA = "11111111-1111-4111-8111-111111111111";
const restaurantB = "22222222-2222-4222-8222-222222222222";
const ownerUserId = "33333333-3333-4333-8333-333333333333";
const staffUserId = "44444444-4444-4444-8444-444444444444";
const ownerMembershipId = "55555555-5555-4555-8555-555555555555";
const staffMembershipId = "66666666-6666-4666-8666-666666666666";
const invitationId = "77777777-7777-4777-8777-777777777777";
const timestamp = "2026-09-04T12:00:00.000Z";
const token = "t".repeat(43);
const meta = { page: 1, limit: 20, total: 2, totalPages: 1, hasNext: false, hasPrevious: false };
const owner: Member = { id: ownerMembershipId, user: { id: ownerUserId, email: "owner@example.com" }, role: "OWNER", active: true, createdAt: timestamp, updatedAt: timestamp };
const staff: Member = { id: staffMembershipId, user: { id: staffUserId, email: "staff@example.com" }, role: "STAFF", active: true, createdAt: timestamp, updatedAt: timestamp };
const pendingInvitation: Invitation = { id: invitationId, email: "invited@example.com", role: "STAFF", createdAt: timestamp, expiresAt: "2099-09-11T12:00:00.000Z", acceptedAt: null, revokedAt: null };
type Handler = (url: URL, init?: RequestInit) => Response | Promise<Response> | undefined;

type FixtureOptions = {
  path?: string;
  session?: Session | null;
  memberships?: Membership[];
  members?: Member[];
  invitations?: Invitation[];
  handler?: Handler;
};

function fixture(options: FixtureOptions = {}) {
  let memberships = options.memberships ?? [{ restaurantId: restaurantA, role: "OWNER" as const }];
  let currentSession: Session | null = options.session === undefined ? { user: { id: ownerUserId, email: "owner@example.com" }, memberships, csrfToken: "team-csrf" } : options.session;
  let members = options.members ?? [owner, staff];
  let invitations = options.invitations ?? [pendingInvitation];
  const transport = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input)); const method = init?.method ?? "GET";
    if (url.pathname === "/auth/session") return currentSession ? Response.json(currentSession) : Response.json({ code: "UNAUTHENTICATED", message: "Unauthenticated" }, { status: 401 });
    if (url.pathname === "/restaurants") return Response.json([{ id: restaurantA, name: "Centro" }, { id: restaurantB, name: "Norte" }]);
    if (url.pathname.includes("/dashboard/")) return url.pathname.endsWith("sales-summary") ? Response.json({ period: { startsAt: null, endsAt: null }, orders: { total: 0, paid: 0, pending: 0, delivered: 0, cancelled: 0 }, revenue: 0, averageTicket: 0 }) : Response.json([]);
    const overridden = options.handler?.(url, init); if (overridden) return overridden;
    if (method === "GET" && url.pathname.endsWith("/members")) {
      const page = Number(url.searchParams.get("page"));
      const data = page === 2 ? [{ ...staff, id: crypto.randomUUID(), user: { ...staff.user, id: crypto.randomUUID(), email: "zeta@example.com" } }] : members;
      return Response.json({ data, meta: page === 1 ? { ...meta, total: members.length, totalPages: 2, hasNext: true } : { page: 2, limit: 20, total: members.length + 1, totalPages: 2, hasNext: false, hasPrevious: true } });
    }
    if (method === "PATCH" && url.pathname.includes("/members/")) {
      const body = JSON.parse(String(init?.body)) as { role?: "OWNER" | "STAFF"; active?: boolean };
      const id = url.pathname.split("/").at(-1);
      const current = members.find((item) => item.id === id);
      if (!current) throw new Error("member missing");
      const updated = { ...current, ...body, updatedAt: timestamp };
      members = members.map((item) => item.id === id ? updated : item);
      if (current.user.id === ownerUserId && currentSession) {
        memberships = body.active === false ? memberships.filter((item) => item.restaurantId !== restaurantA) : memberships.map((item) => item.restaurantId === restaurantA ? { ...item, role: body.role ?? item.role } : item);
        currentSession = { ...currentSession, memberships };
      }
      return Response.json(updated);
    }
    if (method === "GET" && url.pathname.endsWith("/member-invitations")) return Response.json({ data: invitations, meta: { ...meta, total: invitations.length, totalPages: invitations.length ? 1 : 0 } });
    if (method === "POST" && url.pathname.endsWith("/member-invitations")) {
      const email = (JSON.parse(String(init?.body)) as { email: string }).email;
      const invitation = { ...pendingInvitation, id: crypto.randomUUID(), email };
      invitations = [invitation, ...invitations];
      return Response.json({ invitation, token }, { status: 201 });
    }
    if (method === "DELETE" && url.pathname.includes("/member-invitations/")) {
      invitations = invitations.map((item) => item.id === url.pathname.split("/").at(-1) ? { ...item, revokedAt: timestamp } : item);
      return new Response(null, { status: 204 });
    }
    if (method === "POST" && url.pathname === "/auth/member-invitations/accept") return Response.json(staff, { status: 201 });
    if (method === "POST" && url.pathname === "/member-invitations/accept") {
      if (currentSession) currentSession = { ...currentSession, memberships: [...currentSession.memberships, { restaurantId: restaurantA, role: "STAFF" }] };
      return Response.json(staff, { status: 201 });
    }
    throw new Error(`Unexpected request: ${method} ${url.pathname}`);
  });
  render(<MemoryRouter initialEntries={[options.path ?? "/equipe"]}><App service={new AuthService(new ApiClient("https://api.example.com", transport))} /></MemoryRouter>);
  const teamRequests = () => transport.mock.calls.filter(([input]) => /members|invitations/.test(new URL(String(input)).pathname));
  return { transport, teamRequests };
}

async function openInvitations() {
  const nav = await screen.findByRole("navigation", { name: "Áreas da equipe" });
  await userEvent.click(within(nav).getByRole("button", { name: "Convites" }));
}

function rowFor(email: string) {
  const row = within(screen.getByRole("table", { name: "Membros do restaurante" })).getByText(email).closest("tr");
  if (!row) throw new Error(`Row not found for ${email}`);
  return within(row);
}

describe("Users and Memberships UI", () => {
  it("shows OWNER navigation, ordered member fields and paginates with server metadata", async () => {
    const { teamRequests } = fixture();
    expect(await screen.findByRole("link", { name: /Equipe/ })).toBeTruthy();
    const table = within(await screen.findByRole("table", { name: "Membros do restaurante" }));
    expect(table.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["owner@example.com", "staff@example.com"]);
    expect(table.getByText("Proprietário")).toBeTruthy(); expect(table.getByText("Equipe")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Próxima" }));
    expect(await screen.findByText("zeta@example.com")).toBeTruthy();
    expect(teamRequests().at(-1)?.[0].toString()).toContain("page=2&limit=20");
  });

  it("keeps STAFF out of navigation, route and admin APIs", async () => {
    const { teamRequests } = fixture({ memberships: [{ restaurantId: restaurantA, role: "STAFF" }] });
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Equipe/ })).toBeNull();
    expect(teamRequests()).toHaveLength(0);
  });

  it("promotes, demotes, activates and deactivates only after explicit confirmation", async () => {
    const { teamRequests } = fixture(); await screen.findByText("staff@example.com");
    await userEvent.click(rowFor("staff@example.com").getByRole("button", { name: "Tornar OWNER" }));
    expect(teamRequests().filter(([, init]) => init?.method === "PATCH")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar OWNER" })); await screen.findByText("Acesso atualizado.");
    await userEvent.click(rowFor("staff@example.com").getByRole("button", { name: "Tornar STAFF" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar STAFF" })); await screen.findByText("Acesso atualizado.");
    await userEvent.click(rowFor("staff@example.com").getByRole("button", { name: "Desativar acesso" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar desativação" })); await screen.findByText("Acesso atualizado.");
    await userEvent.click(rowFor("staff@example.com").getByRole("button", { name: "Ativar acesso" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar ativação" })); await screen.findByText("Acesso atualizado.");
    expect(teamRequests().filter(([, init]) => init?.method === "PATCH").map(([, init]) => init?.body)).toEqual([JSON.stringify({ role: "OWNER" }), JSON.stringify({ role: "STAFF" }), JSON.stringify({ active: false }), JSON.stringify({ active: true })]);
  });

  it("shows a specific LAST_ACTIVE_OWNER conflict and reloads authoritative state", async () => {
    fixture({ members: [owner], handler: (url, init) => init?.method === "PATCH" && url.pathname.endsWith(ownerMembershipId) ? Response.json({ code: "LAST_ACTIVE_OWNER", message: "must keep owner" }, { status: 409 }) : undefined });
    await screen.findByRole("table", { name: "Membros do restaurante" }); await userEvent.click(screen.getByRole("button", { name: "Tornar STAFF" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar STAFF" }));
    expect((await screen.findByRole("alert")).textContent).toContain("manter pelo menos um proprietário ativo");
    expect(within(screen.getByRole("table", { name: "Membros do restaurante" })).getByText("owner@example.com")).toBeTruthy();
  });

  it("refreshes the session after changing the current owner's membership", async () => {
    const { transport } = fixture(); await screen.findByRole("table", { name: "Membros do restaurante" });
    const before = transport.mock.calls.filter(([input]) => new URL(String(input)).pathname === "/auth/session").length;
    await userEvent.click(rowFor("owner@example.com").getByRole("button", { name: "Tornar STAFF" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar STAFF" }));
    await screen.findByRole("heading", { name: "Visão geral" });
    expect(screen.queryByRole("link", { name: /Equipe/ })).toBeNull();
    expect(transport.mock.calls.filter(([input]) => new URL(String(input)).pathname === "/auth/session").length).toBeGreaterThan(before);
  });

  it("creates a canonical invitation and keeps its token only in volatile UI state", async () => {
    const storage = vi.spyOn(Storage.prototype, "setItem"); const { teamRequests } = fixture(); await openInvitations(); await screen.findByText("invited@example.com");
    await userEvent.type(screen.getByLabelText("E-mail"), " New.Person@Example.COM "); await userEvent.click(screen.getByRole("button", { name: "Criar convite STAFF" }));
    expect((await screen.findByLabelText("Token")).getAttribute("value")).toBe(token);
    expect((screen.getByLabelText("Link de aceite") as HTMLInputElement).value).toContain(`/convite?token=${token}`);
    expect(teamRequests().find(([, init]) => init?.method === "POST")?.[1]?.body).toBe(JSON.stringify({ email: "new.person@example.com" }));
    expect(teamRequests().some(([input]) => new URL(String(input)).pathname.includes("/users"))).toBe(false);
    expect(storage).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Fechar e apagar da tela" })); expect(screen.queryByLabelText("Token")).toBeNull(); storage.mockRestore();
  });

  it("renders pending, accepted, revoked and expired from timestamps", async () => {
    fixture({ invitations: [pendingInvitation, { ...pendingInvitation, id: crypto.randomUUID(), email: "accepted@example.com", acceptedAt: timestamp }, { ...pendingInvitation, id: crypto.randomUUID(), email: "revoked@example.com", revokedAt: timestamp }, { ...pendingInvitation, id: crypto.randomUUID(), email: "expired@example.com", expiresAt: "2020-01-01T00:00:00.000Z" }] });
    await openInvitations(); const table = within(await screen.findByRole("table", { name: "Convites do restaurante" }));
    for (const status of ["Pendente", "Aceito", "Revogado", "Expirado"]) expect(table.getByText(status)).toBeTruthy();
    expect(screen.queryByText(/tokenHash/)).toBeNull();
  });

  it("revokes only after confirmation and reflects the server state", async () => {
    const { teamRequests } = fixture(); await openInvitations(); await screen.findByText("invited@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Revogar" })); expect(teamRequests().filter(([, init]) => init?.method === "DELETE")).toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: "Confirmar revogação" })); await screen.findByText("Convite revogado.");
    expect(await screen.findByText("Revogado")).toBeTruthy();
  });

  it("preserves invitation errors without revealing global User existence", async () => {
    fixture({ handler: (url, init) => init?.method === "POST" && url.pathname.endsWith("/member-invitations") ? Response.json({ code: "INVITATION_ALREADY_PENDING", message: "A pending invitation already exists for this email." }, { status: 409 }) : undefined });
    await openInvitations(); await userEvent.type(screen.getByLabelText("E-mail"), "person@example.com"); await userEvent.click(screen.getByRole("button", { name: "Criar convite STAFF" }));
    const alert = await screen.findByRole("alert"); expect(alert.textContent).toContain("INVITATION_ALREADY_PENDING"); expect(alert.textContent).not.toMatch(/usuário global|conta existente/i);
  });

  it("shows list failure and retries invitations", async () => {
    let fail = true;
    fixture({ handler: (url, init) => (init?.method ?? "GET") === "GET" && url.pathname.endsWith("/member-invitations") && fail ? Response.json({ code: "TEMPORARY", message: "Convites indisponíveis" }, { status: 503 }) : undefined });
    await openInvitations(); await screen.findByText("Convites indisponíveis"); fail = false; await userEvent.click(screen.getByRole("button", { name: "Tentar carregar convites novamente" })); await screen.findByText("invited@example.com");
  });

  it("validates password confirmation locally and accepts a new User without persisting secrets", async () => {
    const storage = vi.spyOn(Storage.prototype, "setItem"); const consoleSpy = vi.spyOn(console, "log"); const { teamRequests } = fixture({ path: `/convite?token=${token}`, session: null });
    await screen.findByRole("heading", { name: "Aceitar acesso" }); await userEvent.type(screen.getByLabelText("Senha"), "a-secure-password"); await userEvent.type(screen.getByLabelText("Confirmar senha"), "different-value"); await userEvent.click(screen.getByRole("button", { name: "Aceitar convite" }));
    expect((await screen.findByRole("alert")).textContent).toContain("não coincidem"); expect(teamRequests().filter(([, init]) => init?.method === "POST")).toHaveLength(0);
    await userEvent.clear(screen.getByLabelText("Confirmar senha")); await userEvent.type(screen.getByLabelText("Confirmar senha"), "a-secure-password"); await userEvent.click(screen.getByRole("button", { name: "Aceitar convite" }));
    await screen.findByRole("heading", { name: "Entre na sua conta" }); const request = teamRequests().find(([input]) => new URL(String(input)).pathname === "/auth/member-invitations/accept");
    expect(request?.[1]?.body).toBe(JSON.stringify({ token, password: "a-secure-password" })); expect(storage).not.toHaveBeenCalled(); expect(consoleSpy).not.toHaveBeenCalled(); storage.mockRestore(); consoleSpy.mockRestore();
  });

  it("accepts for an authenticated User without requesting or changing password and refreshes session", async () => {
    const existingSession: Session = { user: { id: staffUserId, email: "staff@example.com" }, memberships: [{ restaurantId: restaurantB, role: "STAFF" }], csrfToken: "existing-csrf" };
    const { teamRequests, transport } = fixture({ path: `/convite?token=${token}`, session: existingSession });
    await screen.findByRole("heading", { name: "Aceitar acesso" }); expect(screen.queryByLabelText("Senha")).toBeNull(); await userEvent.click(screen.getByRole("button", { name: "Aceitar convite" }));
    await screen.findByRole("heading", { name: "Qual casa vamos acompanhar?" }); const request = teamRequests().find(([input]) => new URL(String(input)).pathname === "/member-invitations/accept");
    expect(request?.[1]?.body).toBe(JSON.stringify({ token })); expect(new Headers(request?.[1]?.headers).get("X-CSRF-Token")).toBe("existing-csrf");
    expect(transport.mock.calls.filter(([input]) => new URL(String(input)).pathname === "/auth/session")).toHaveLength(2);
  });

  it.each([
    ["INVITATION_EXPIRED", "expirou"],
    ["INVITATION_REVOKED", "revogado"],
    ["INVITATION_ALREADY_USED", "já foi utilizado"],
  ])("shows the %s acceptance state", async (code, text) => {
    fixture({ path: `/convite?token=${token}`, session: null, handler: (url, init) => init?.method === "POST" && url.pathname === "/auth/member-invitations/accept" ? Response.json({ code, message: "generic" }, { status: 409 }) : undefined });
    await screen.findByLabelText("Senha"); await userEvent.type(screen.getByLabelText("Senha"), "a-secure-password"); await userEvent.type(screen.getByLabelText("Confirmar senha"), "a-secure-password"); await userEvent.click(screen.getByRole("button", { name: "Aceitar convite" })); expect((await screen.findByRole("alert")).textContent).toContain(text);
  });

  it("resets the feature and ignores an aborted stale member response on Restaurant switch", async () => {
    let resolve: (response: Response) => void = () => {};
    const { teamRequests } = fixture({ path: "/", memberships: [{ restaurantId: restaurantA, role: "OWNER" }, { restaurantId: restaurantB, role: "OWNER" }], handler: (url, init) => {
      if ((init?.method ?? "GET") !== "GET" || !url.pathname.endsWith("/members")) return undefined;
      if (url.pathname.includes(restaurantA)) return new Promise<Response>((done) => { resolve = done; });
      return Response.json({ data: [{ ...owner, id: crypto.randomUUID(), user: { ...owner.user, id: crypto.randomUUID(), email: "north@example.com" } }], meta: { ...meta, total: 1 } });
    } });
    await screen.findByRole("heading", { name: "Qual casa vamos acompanhar?" }); await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantA); await userEvent.click(screen.getByRole("link", { name: /Equipe/ })); await screen.findByText("Carregando membros…"); const old = teamRequests().at(-1);
    await userEvent.selectOptions(screen.getByLabelText("RESTAURANTE"), restaurantB); expect(await screen.findByText("north@example.com")).toBeTruthy(); expect(old?.[1]?.signal?.aborted).toBe(true);
    await act(async () => resolve(Response.json({ data: [owner], meta: { ...meta, total: 1 } }))); expect(within(screen.getByRole("table", { name: "Membros do restaurante" })).queryByText("owner@example.com")).toBeNull(); expect(screen.queryByLabelText("Token")).toBeNull();
  });

  it("shows empty states for members and invitations", async () => {
    fixture({ members: [], invitations: [] });
    await screen.findByText("Nenhum membro encontrado."); await openInvitations(); await screen.findByText("Nenhum convite encontrado.");
  });

  it("shows a member list failure and retries cleanly", async () => {
    let fail = true;
    fixture({ handler: (url, init) => (init?.method ?? "GET") === "GET" && url.pathname.endsWith("/members") && fail ? Response.json({ code: "TEMPORARY", message: "Membros indisponíveis" }, { status: 503 }) : undefined });
    await screen.findByText("Membros indisponíveis"); fail = false; await userEvent.click(screen.getByRole("button", { name: "Tentar carregar membros novamente" })); await screen.findByRole("table", { name: "Membros do restaurante" });
  });

  it("preserves the backend conflict when a pending-looking invitation was already accepted", async () => {
    fixture({ handler: (url, init) => init?.method === "DELETE" && url.pathname.includes("/member-invitations/") ? Response.json({ code: "INVITATION_ALREADY_USED", message: "The invitation has already been used." }, { status: 409 }) : undefined });
    await openInvitations(); await screen.findByText("invited@example.com"); await userEvent.click(screen.getByRole("button", { name: "Revogar" })); await userEvent.click(screen.getByRole("button", { name: "Confirmar revogação" }));
    expect((await screen.findByRole("alert")).textContent).toContain("INVITATION_ALREADY_USED");
  });

  it("prevents duplicate invitation submits while the request is pending", async () => {
    let resolve: (response: Response) => void = () => {};
    const { teamRequests } = fixture({ handler: (url, init) => init?.method === "POST" && url.pathname.endsWith("/member-invitations") ? new Promise<Response>((done) => { resolve = done; }) : undefined });
    await openInvitations(); await userEvent.type(screen.getByLabelText("E-mail"), "new@example.com"); const form = screen.getByRole("form", { name: "Criar convite" }); fireEvent.submit(form); fireEvent.submit(form);
    await waitFor(() => expect(teamRequests().filter(([, init]) => init?.method === "POST")).toHaveLength(1)); await act(async () => resolve(Response.json({ invitation: { ...pendingInvitation, email: "new@example.com" }, token }, { status: 201 })));
  });
});