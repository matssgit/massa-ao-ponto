import { useCallback, useMemo, useRef, useState } from "react";
import { Pagination } from "../../components/pagination";
import { ApiError } from "../../lib/api-client";
import { TeamConfirm } from "./team-confirm";
import { invitationEmailSchema, type Invitation, type TeamService } from "./team-service";
import { useTeamQuery } from "./use-team-query";

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
export function invitationStatus(invitation: Invitation, now = new Date()) {
  if (invitation.acceptedAt) return "Aceito";
  if (invitation.revokedAt) return "Revogado";
  if (new Date(invitation.expiresAt) <= now) return "Expirado";
  return "Pendente";
}

type CreatedSecret = { token: string; link: string };

export function InvitationsSection({ restaurantId, service }: { restaurantId: string; service: TeamService }) {
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const [secret, setSecret] = useState<CreatedSecret | null>(null);
  const [revoking, setRevoking] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const key = `${restaurantId}:${page}`;
  const load = useCallback((signal: AbortSignal) => service.listInvitations(restaurantId, page, 20, signal), [page, restaurantId, service]);
  const { state, reload } = useTeamQuery(key, load, "Não foi possível carregar os convites.");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const parsed = invitationEmailSchema.safeParse(email);
    if (!parsed.success) { setFormError(parsed.error.issues[0]?.message ?? "Informe um e-mail válido."); return; }
    pending.current = true; setBusy(true); setFormError(null); setNotice(null); setSecret(null);
    try {
      const created = await service.createInvitation(restaurantId, parsed.data);
      const link = `${window.location.origin}/convite?token=${encodeURIComponent(created.token)}`;
      setSecret({ token: created.token, link }); setEmail(""); setNotice({ error: false, text: "Convite criado." });
      if (page === 1) reload(); else setPage(1);
    } catch (error) {
      setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível criar o convite." });
    } finally { pending.current = false; setBusy(false); }
  }

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setNotice({ error: false, text: `${label} copiado.` }); }
    catch { setNotice({ error: true, text: "Não foi possível copiar. Selecione o conteúdo manualmente." }); }
  }

  async function revoke() {
    if (!revoking || pending.current) return;
    pending.current = true; setBusy(true); setNotice(null);
    try { await service.revokeInvitation(restaurantId, revoking.id); setRevoking(null); setNotice({ error: false, text: "Convite revogado." }); reload(); }
    catch (error) { setRevoking(null); setNotice({ error: true, text: error instanceof ApiError ? `${error.message} (${error.code})` : "Não foi possível revogar o convite." }); reload(); }
    finally { pending.current = false; setBusy(false); }
  }

  const rows = useMemo(() => state.status === "success" ? state.data.data : [], [state]);
  return <section className="team-section" aria-labelledby="invitations-heading">
    <div className="team-section-heading"><div><h2 id="invitations-heading">Convites</h2><p>Convites são criados como STAFF e expiram automaticamente.</p></div><button className="secondary" onClick={reload}>Atualizar</button></div>
    <form className="invite-form" aria-label="Criar convite" onSubmit={(event) => void create(event)}>
      <label htmlFor="invite-email">E-mail</label>
      <div><input id="invite-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} autoComplete="email" placeholder="pessoa@exemplo.com" /><button className="primary" disabled={busy}>{busy ? "Criando…" : "Criar convite STAFF"}</button></div>
      {formError && <p className="error" role="alert">{formError}</p>}
    </form>
    {notice && <p className={notice.error ? "error" : "team-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {secret && <aside className="invitation-secret" aria-label="Token temporário do convite">
      <h3>Copie agora: este token não poderá ser recuperado</h3>
      <p>Envie por um canal confiável. Fechar esta caixa, trocar de restaurante ou recarregar a página remove o token da interface.</p>
      <label htmlFor="invitation-token">Token</label><input id="invitation-token" readOnly value={secret.token} />
      <label htmlFor="invitation-link">Link de aceite</label><input id="invitation-link" readOnly value={secret.link} />
      <div className="team-row-actions"><button className="secondary" onClick={() => void copy(secret.token, "Token")}>Copiar token</button><button className="secondary" onClick={() => void copy(secret.link, "Link")}>Copiar link</button><button className="secondary" onClick={() => setSecret(null)}>Fechar e apagar da tela</button></div>
    </aside>}
    {revoking && <TeamConfirm title="Revogar convite" detail={`Revogar o convite pendente para ${revoking.email}? O token deixará de funcionar.`} action="Confirmar revogação" busy={busy} onConfirm={() => void revoke()} onCancel={() => setRevoking(null)} />}
    {state.status === "loading" && <p className="team-feedback" role="status">Carregando convites…</p>}
    {state.status === "error" && <div className="team-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar convites novamente</button></div>}
    {state.status === "success" && (rows.length === 0 ? <p className="team-feedback" role="status">Nenhum convite encontrado.</p> : <>
      <table className="team-table" aria-label="Convites do restaurante"><thead><tr><th>E-mail</th><th>Status</th><th>Criado</th><th>Expira</th><th>Ações</th></tr></thead><tbody>{rows.map((invitation) => { const status = invitationStatus(invitation); return <tr key={invitation.id}><th scope="row">{invitation.email}</th><td data-label="Status"><span className={`invite-status ${status.toLowerCase()}`}>{status}</span></td><td data-label="Criado">{dateTime.format(new Date(invitation.createdAt))}</td><td data-label="Expira">{dateTime.format(new Date(invitation.expiresAt))}</td><td>{status === "Pendente" ? <button className="secondary" disabled={busy} onClick={() => setRevoking(invitation)}>Revogar</button> : <span className="muted">Sem ações</span>}</td></tr>; })}</tbody></table>
      <Pagination meta={state.data.meta} onPage={setPage} className="team-pagination" label="Paginação de convites" />
    </>)}
  </section>;
}