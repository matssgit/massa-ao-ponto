import { useCallback, useMemo, useRef, useState } from "react";
import { ApiError } from "../../lib/api-client";
import { useAuth } from "../auth/auth-state";
import { useRestaurant } from "../auth/restaurant-state";
import { typeLabels } from "../orders/order-labels";
import type { OrderStatus } from "../orders/orders-service";
import { KitchenService, kitchenStatuses, type KitchenOrder, type KitchenStatus } from "./kitchen-service";
import { useKitchenQueue } from "./use-kitchen-queue";
import "./kitchen.css";

const columnLabels: Record<KitchenStatus, string> = { PENDING: "Entrada", CONFIRMED: "Confirmados", PREPARING: "Em preparo", READY: "Prontos" };
const actions: Partial<Record<KitchenStatus, { status: OrderStatus; label: string }>> = {
  PENDING: { status: "CONFIRMED", label: "Confirmar pedido" },
  CONFIRMED: { status: "PREPARING", label: "Iniciar preparo" },
  PREPARING: { status: "READY", label: "Marcar como pronto" },
};

export function elapsedTime(createdAt: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}min`;
}

function KitchenCard({ entry, busy, onAdvance }: { entry: KitchenOrder; busy: boolean; onAdvance: (entry: KitchenOrder, status: OrderStatus) => void }) {
  const { order, items } = entry;
  const action = actions[order.status as KitchenStatus];
  const old = Date.now() - new Date(order.createdAt).getTime() >= 30 * 60_000;
  return <article className={`kitchen-ticket ${old ? "kitchen-ticket-old" : ""}`} aria-label={`Pedido ${order.id.slice(0, 8)}`}>
    <header><div><strong>#{order.id.slice(0, 8)}</strong><span>{typeLabels[order.type]} · {order.customerName}</span></div><time dateTime={order.createdAt}>{elapsedTime(order.createdAt)}</time></header>
    <ul className="kitchen-items">{items.map(item => <li key={item.id}><strong><b>{item.quantity}×</b> {item.productName}</strong>{item.addons.length > 0 && <ul>{item.addons.map(addon => <li key={addon.id}>{addon.quantity}× {addon.addonName}</li>)}</ul>}</li>)}</ul>
    {order.observation && <p className="kitchen-note"><strong>Observação:</strong> {order.observation}</p>}
    <footer><span className={`kitchen-payment kitchen-payment-${order.paymentStatus.toLowerCase()}`}>{order.paymentStatus === "PAID" ? "Pago" : "Pagamento pendente"}</span>
      {action && <button className="primary" disabled={busy} onClick={() => onAdvance(entry, action.status)}>{busy ? "Atualizando…" : action.label}</button>}
    </footer>
  </article>;
}

function KitchenBoard({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new KitchenService(auth.client), [auth.client]);
  const load = useCallback((signal: AbortSignal) => service.list(restaurantId, signal), [service, restaurantId]);
  const { state, refresh } = useKitchenQueue(restaurantId, load);
  const [busyOrderId, setBusyOrderId] = useState<string>();
  const [mutationError, setMutationError] = useState<string>();
  const mutating = useRef(false);
  async function advance(entry: KitchenOrder, status: OrderStatus) {
    if (mutating.current) return;
    mutating.current = true; setBusyOrderId(entry.order.id); setMutationError(undefined);
    try { await service.advance(restaurantId, entry.order.id, status); refresh(); }
    catch (cause) { setMutationError(cause instanceof ApiError ? cause.message : "Não foi possível atualizar o pedido."); refresh(); }
    finally { mutating.current = false; setBusyOrderId(undefined); }
  }
  const data = state.status === "success" ? state.data : [];
  return <section className="kitchen-page">
    <header className="kitchen-heading"><div><p className="eyebrow">OPERAÇÃO DA CASA</p><h1>Cozinha</h1><p>Pedidos ativos, dos recebidos aos prontos.</p></div><button className="secondary" disabled={state.status === "loading" || (state.status === "success" && state.refreshing)} onClick={refresh}>{state.status === "success" && state.refreshing ? "Atualizando fila…" : "Atualizar agora"}</button></header>
    {mutationError && <p className="error" role="alert">{mutationError}</p>}
    {state.status === "loading" && <p className="kitchen-feedback" role="status">Carregando fila da cozinha…</p>}
    {state.status === "error" && <div className="kitchen-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={refresh}>Tentar novamente</button></div>}
    {state.status === "success" && <>{state.refreshError && <p className="error" role="alert">{state.refreshError}</p>}<p className="kitchen-summary" aria-live="polite">{data.length === 0 ? "Nenhuma comanda ativa." : `${data.length} ${data.length === 1 ? "comanda ativa" : "comandas ativas"}.`}</p><div className="kitchen-board">{kitchenStatuses.map(status => {
      const entries = data.filter(({ order }) => order.status === status);
      return <section className="kitchen-column" key={status} aria-labelledby={`kitchen-${status}`}><h2 id={`kitchen-${status}`}>{columnLabels[status]} <span>{entries.length}</span></h2>{entries.length === 0 ? <p className="kitchen-column-empty">Nenhum pedido.</p> : entries.map(entry => <KitchenCard key={entry.order.id} entry={entry} busy={busyOrderId === entry.order.id} onAdvance={(item, next) => void advance(item, next)} />)}</section>;
    })}</div></>}
  </section>;
}

export function KitchenPage() {
  const { restaurantId } = useRestaurant();
  return restaurantId ? <KitchenBoard key={restaurantId} restaurantId={restaurantId} /> : null;
}
