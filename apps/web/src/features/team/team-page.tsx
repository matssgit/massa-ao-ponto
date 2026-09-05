import { useCallback, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import { Pagination } from "../../components/pagination";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../auth/auth-state";
import { isOwner, useRestaurant } from "../auth/restaurant-state";
import { InvitationsSection } from "./invitations-section";
import { MembersList } from "./members-list";
import { TeamConfirm } from "./team-confirm";
import { TeamService, type Member, type MembershipChanges } from "./team-service";
import { useTeamQuery } from "./use-team-query";
import "./team.css";

type TeamTab = "members" | "invitations";
type PendingChange = { member: Member; changes: MembershipChanges; title: string; detail: string; action: string };

function membershipFailure(error: unknown) {
  if (error instanceof ApiError && error.code === "LAST_ACTIVE_OWNER") return "Este restaurante precisa manter pelo menos um proprietário ativo. Promova ou ative outro OWNER antes desta alteração. (LAST_ACTIVE_OWNER)";
  return error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível atualizar o acesso.";
}

function MembersSection({ restaurantId, service }: { restaurantId: string; service: TeamService }) {
  const { user, refresh } = useAuth();
  const [page, setPage] = useState(1);
  const [change, setChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const pending = useRef(false);
  const key = `${restaurantId}:${page}`;
  const load = useCallback((signal: AbortSignal) => service.listMembers(restaurantId, page, 20, signal), [page, restaurantId, service]);
  const { state, reload } = useTeamQuery(key, load, "Não foi possível carregar os membros.");

  function confirmRole(member: Member) {
    const role = member.role === "OWNER" ? "STAFF" : "OWNER";
    setChange({ member, changes: { role }, title: "Confirmar mudança de perfil", detail: `${member.user.email} passará a ter o perfil ${role}. Essa mudança vale no próximo request.`, action: `Confirmar ${role}` });
  }

  function confirmActive(member: Member) {
    const active = !member.active;
    setChange({ member, changes: { active }, title: active ? "Ativar acesso" : "Desativar acesso", detail: active ? `${member.user.email} voltará a acessar este restaurante.` : `${member.user.email} perderá o acesso a este restaurante no próximo request.`, action: active ? "Confirmar ativação" : "Confirmar desativação" });
  }

  async function applyChange() {
    if (!change || pending.current) return;
    pending.current = true; setBusy(true); setNotice(null);
    const self = change.member.user.id === user?.id;
    try {
      await service.updateMember(restaurantId, change.member.id, change.changes);
      setChange(null);
      if (self) { await refresh(); return; }
      setNotice({ error: false, text: "Acesso atualizado." }); reload();
    } catch (error) {
      setChange(null); setNotice({ error: true, text: membershipFailure(error) }); reload();
    } finally { pending.current = false; setBusy(false); }
  }

  return <section className="team-section" aria-labelledby="members-heading">
    <div className="team-section-heading"><div><h2 id="members-heading">Membros</h2><p>Perfis e acessos vinculados somente ao restaurante atual.</p></div><button className="secondary" onClick={reload}>Atualizar</button></div>
    {notice && <p className={notice.error ? "error" : "team-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {change && <TeamConfirm title={change.title} detail={change.detail} action={change.action} busy={busy} onConfirm={() => void applyChange()} onCancel={() => setChange(null)} />}
    {state.status === "loading" && <p className="team-feedback" role="status">Carregando membros…</p>}
    {state.status === "error" && <div className="team-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar membros novamente</button></div>}
    {state.status === "success" && (state.data.data.length === 0 ? <p className="team-feedback" role="status">Nenhum membro encontrado.</p> : <>
      <MembersList members={state.data.data} busy={busy} onRole={confirmRole} onActive={confirmActive} />
      <Pagination meta={state.data.meta} onPage={setPage} className="team-pagination" label="Paginação de membros" />
    </>)}
  </section>;
}

function OwnerTeam({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new TeamService(auth.client), [auth.client]);
  const [tab, setTab] = useState<TeamTab>("members");
  return <section className="team-page">
    <header className="team-heading"><p className="eyebrow">USUÁRIOS E ACESSOS</p><h1>Equipe</h1><p>Administre quem pode operar este restaurante e envie convites de acesso.</p></header>
    <nav className="team-tabs" aria-label="Áreas da equipe"><button className={tab === "members" ? "active" : ""} aria-current={tab === "members" ? "page" : undefined} onClick={() => setTab("members")}>Membros</button><button className={tab === "invitations" ? "active" : ""} aria-current={tab === "invitations" ? "page" : undefined} onClick={() => setTab("invitations")}>Convites</button></nav>
    {tab === "members" ? <MembersSection restaurantId={restaurantId} service={service} /> : <InvitationsSection restaurantId={restaurantId} service={service} />}
  </section>;
}

export function TeamPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!restaurantId || !membership) return null;
  if (!isOwner(membership)) return <Navigate to="/" replace />;
  return <OwnerTeam key={restaurantId} restaurantId={restaurantId} />;
}