import { useMemo, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { Brand } from "../../components/brand";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../auth/auth-state";
import { existingInvitationAcceptanceSchema, newInvitationAcceptanceSchema, TeamService } from "./team-service";
import "./team.css";

function invitationError(error: unknown) {
  if (!(error instanceof ApiError)) return "Não foi possível aceitar o convite.";
  const known: Record<string, string> = {
    INVITATION_INVALID: "O convite é inválido ou não corresponde a esta conta.",
    INVITATION_EXPIRED: "Este convite expirou. Solicite um novo convite ao proprietário.",
    INVITATION_REVOKED: "Este convite foi revogado pelo proprietário.",
    INVITATION_ALREADY_USED: "Este convite já foi utilizado.",
    MEMBER_ALREADY_EXISTS: "Esta conta já possui acesso ao restaurante.",
  };
  return `${known[error.code] ?? error.message} (${error.code})`;
}

export function InvitationAcceptancePage() {
  const { authenticated, refresh, service: auth } = useAuth();
  const service = useMemo(() => new TeamService(auth.client), [auth.client]);
  const [query] = useSearchParams();
  const [token, setToken] = useState(query.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [destination, setDestination] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const existingInput = authenticated ? existingInvitationAcceptanceSchema.safeParse({ token }) : null;
    const newInput = authenticated ? null : newInvitationAcceptanceSchema.safeParse({ token, password, passwordConfirmation: confirmation });
    const validationError = existingInput?.success === false ? existingInput.error : newInput?.success === false ? newInput.error : null;
    if (validationError) { setError(validationError.issues[0]?.message ?? "Revise os dados informados."); return; }
    pending.current = true; setBusy(true); setError(null);
    try {
      if (existingInput?.success) {
        await service.acceptExistingUser(existingInput.data.token);
        setDestination("/");
        await refresh();
      } else if (newInput?.success) {
        await service.acceptNewUser(newInput.data.token, newInput.data.password);
        setDestination("/login");
      }
    } catch (cause) { setError(invitationError(cause)); }
    finally { pending.current = false; setBusy(false); }
  }

  if (destination) return <Navigate to={destination} replace />;
  return <main className="invitation-accept-page"><div className="invitation-accept-card"><Brand /><p className="eyebrow">CONVITE DE EQUIPE</p><h1>Aceitar acesso</h1><p>{authenticated ? "Confirme o token recebido. O convite precisa pertencer ao e-mail da sua sessão atual." : "Defina sua senha para criar a conta vinculada ao convite."}</p>
    <form aria-label="Aceitar convite" onSubmit={(event) => void submit(event)}>
      <label htmlFor="accept-token">Token do convite</label><input id="accept-token" value={token} onChange={(event) => setToken(event.target.value)} disabled={busy} autoComplete="off" />
      {!authenticated && <><label htmlFor="accept-password">Senha</label><input id="accept-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} autoComplete="new-password" /><label htmlFor="accept-confirmation">Confirmar senha</label><input id="accept-confirmation" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} autoComplete="new-password" /></>}
      {error && <p className="error" role="alert">{error}</p>}
      <button className="primary" disabled={busy}>{busy ? "Aceitando…" : "Aceitar convite"}</button>
    </form>
    <p className="invitation-privacy">A tela não pesquisa usuários globais e nunca altera a senha de uma conta já autenticada.</p>
  </div></main>;
}