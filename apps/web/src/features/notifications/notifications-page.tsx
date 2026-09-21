import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router";
import { Pagination } from "../../components/pagination";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../auth/auth-state";
import { isOwner, useRestaurant } from "../auth/restaurant-state";
import { eventLabels, NotificationsService, statusLabels, type NotificationsPageData } from "./notifications-service";
import "./notifications.css";

type State = { key: string; data?: NotificationsPageData; error?: string };
const date = (value: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));

function OwnerNotifications({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new NotificationsService(auth.client), [auth.client]);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [version, setVersion] = useState(0);
  const key = [restaurantId, page, status, type, version].join(":");
  const [result, setResult] = useState<State>({ key: "" });
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<{ error: boolean; text: string }>();
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    void service.list(restaurantId, page, status, type, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ key, data });
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult({ key, error: error instanceof ApiError ? error.message : "Não foi possível carregar as notificações." });
    });
    return () => controller.abort();
  }, [service, restaurantId, page, status, type, key]);
  const reload = useCallback(() => setVersion(value => value + 1), []);
  async function retry(id: string) {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller; setBusy(id); setNotice(undefined);
    try {
      const updated = await service.retry(restaurantId, id, controller.signal);
      if (controller.signal.aborted) return;
      setNotice({ error: updated.status !== "SENT", text: updated.status === "SENT" ? "Notificação enviada." : updated.errorSummary ?? "A notificação continua com falha." });
      reload();
    } catch (error) {
      if (!controller.signal.aborted) {
        setNotice({ error: true, text: error instanceof ApiError && (error.status === 0 || error.status >= 500 || error.code === "INVALID_RESPONSE")
          ? "Resultado do reenvio incerto. Atualize a lista antes de tentar novamente."
          : error instanceof ApiError ? error.message : "Não foi possível reenviar." });
        reload();
      }
    } finally {
      if (!controller.signal.aborted) { pending.current = null; setBusy(undefined); }
    }
  }
  const state = result.key === key ? result : undefined;
  return <section className="notifications-page">
    <header><p className="eyebrow">OPERAÇÃO</p><h1>Notificações</h1><p>Consulte os envios e reenvie falhas individualmente.</p><button className="secondary" onClick={reload}>Atualizar</button></header>
    <div className="notification-filters">
      <label>Status<select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Evento<select value={type} onChange={event => { setType(event.target.value); setPage(1); }}><option value="">Todos</option>{Object.entries(eventLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {notice && <p role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {!state && <p role="status">Carregando notificações…</p>}
    {state?.error && <div><p role="alert">{state.error}</p><button className="secondary" onClick={reload}>Tentar novamente</button></div>}
    {state?.data && <>
      {state.data.data.length === 0 ? <p>Nenhuma notificação encontrada.</p> : <ul className="notification-list">{state.data.data.map(item => <li key={item.id}>
        <div className="notification-heading"><h2>{eventLabels[item.type]}</h2><strong>{statusLabels[item.status]}</strong></div>
        <p>{item.resourceType === "ORDER" ? "Pedido" : "Reserva"} · <span title={item.resourceId}>{item.resourceId.slice(0, 8)}</span></p>
        <dl><div><dt>Tentativas</dt><dd>{item.attempts}</dd></div><div><dt>Criada em</dt><dd>{date(item.createdAt)}</dd></div><div><dt>Última tentativa</dt><dd>{date(item.lastAttemptAt)}</dd></div></dl>
        {item.status === "FAILED" && <><p>{item.errorSummary}</p><button className="secondary" disabled={!!busy} onClick={() => void retry(item.id)}>{busy === item.id ? "Reenviando…" : "Reenviar"}</button></>}
      </li>)}</ul>}
      <Pagination meta={state.data.meta} onPage={setPage} className="notification-pagination" label="Paginação de notificações" />
    </>}
  </section>;
}
export function NotificationsPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!isOwner(membership)) return <Navigate to="/" replace />;
  return restaurantId ? <OwnerNotifications key={restaurantId} restaurantId={restaurantId} /> : null;
}
