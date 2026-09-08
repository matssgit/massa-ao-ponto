import { useCallback, useEffect, useRef, useState } from "react";
import { formatCatalogMoney } from "../catalog/catalog-money";
import { ApiError } from "../../lib/api-client";
import type { PublicOrderDetails } from "./schemas";
import { PublicReservationService } from "./service";
import { ErrorNotice, orderStatusLabels, PublicFrame, PublicMissing, usePublicQuery } from "./shared";

const paymentLabels = { PENDING: "Pendente", PAID: "Pago" };
const pickupStages = [
  { status: "PENDING", label: "Pedido recebido" },
  { status: "CONFIRMED", label: "Confirmado" },
  { status: "PREPARING", label: "Em preparo" },
  { status: "READY", label: "Pronto para retirada" },
  { status: "DELIVERED", label: "Concluído" },
] as const;

function OrderProgress({ status }: { status: PublicOrderDetails["order"]["status"] }) {
  if (status === "CANCELLED") {
    return <section className="public-order-cancelled" role="status" aria-label="Pedido cancelado">
      <strong>Pedido cancelado</strong>
      <span>O acompanhamento foi encerrado.</span>
    </section>;
  }
  const currentIndex = status === "OUT_FOR_DELIVERY"
    ? pickupStages.length - 1
    : pickupStages.findIndex(step => step.status === status);
  return <ol className="public-order-progress" aria-label="Progresso do pedido">
    {pickupStages.map((step, index) => {
      const state = index < currentIndex ? "completed" : index === currentIndex ? "current" : "future";
      return <li key={step.status} className={`public-order-progress-${state}`} aria-current={state === "current" ? "step" : undefined}>
        <span className="public-order-progress-marker" aria-hidden="true">{state === "completed" ? "✓" : index + 1}</span>
        <span><strong>{step.label}</strong><small>{state === "completed" ? "Etapa concluída" : state === "current" ? "Etapa atual" : "Próxima etapa"}</small></span>
      </li>;
    })}
  </ol>;
}

export function PublicOrderDetailsPage({ service, token }: { service: PublicReservationService; token: string }) {
  const query = usePublicQuery(useCallback((signal: AbortSignal) => service.lookupOrder(token, signal), [service, token]));
  const [displayed, setDisplayed] = useState<PublicOrderDetails>();
  const [lastRefresh, setLastRefresh] = useState<Date>();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState("");
  const refreshRequested = useRef(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState(false);
  const submitting = useRef(false);
  const alive = useRef(true);
  const action = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const wasConfirming = useRef(false);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!query.data) return;
    setDisplayed(query.data);
    setLastRefresh(new Date());
    if (refreshRequested.current) setRefreshMessage("Pedido atualizado.");
    refreshRequested.current = false;
    setRefreshing(false);
  }, [query.data]);
  useEffect(() => {
    if (!query.error || !refreshRequested.current) return;
    refreshRequested.current = false;
    setRefreshing(false);
  }, [query.error]);
  useEffect(() => {
    if (confirm) dialog.current?.focus();
    else if (wasConfirming.current) action.current?.focus();
    wasConfirming.current = confirm;
  }, [confirm]);

  function refresh() {
    if (refreshing || query.loading) return;
    setRefreshMessage("");
    setRefreshing(true);
    refreshRequested.current = true;
    query.reload();
  }

  async function cancel() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await service.cancelOrder(token);
      if (alive.current) setSuccess(true);
    } catch (cause) {
      if (alive.current) setError(cause);
    } finally {
      submitting.current = false;
      if (alive.current) {
        setBusy(false);
        setConfirm(false);
        refresh();
      }
    }
  }

  const data = displayed ?? query.data;
  const invalid = !data && query.error instanceof ApiError && [400, 404].includes(query.error.status);
  const cancellable = data && data.order.paymentStatus === "PENDING" && ["PENDING", "CONFIRMED"].includes(data.order.status);
  return <PublicFrame page="order">
    {query.loading && !data ? <p role="status">Consultando seu pedido…</p>
      : invalid ? <PublicMissing order />
      : query.error && !data ? <ErrorNotice error={query.error} retry={query.reload} />
      : data && <div className="public-detail">
        <p className="public-eyebrow">Retirada no local</p>
        <h1>Seu pedido</h1>
        <p className="public-status">{orderStatusLabels[data.order.status]}</p>
        <OrderProgress status={data.order.status} />
        <div className="public-order-refresh">
          <button className="public-secondary" disabled={refreshing} onClick={refresh}>{refreshing ? "Atualizando pedido…" : "Atualizar pedido"}</button>
          <div aria-live="polite">
            {lastRefresh && <small>Última consulta: {lastRefresh.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>}
            {refreshMessage && <span>{refreshMessage}</span>}
          </div>
        </div>
        {query.error !== undefined && displayed && <ErrorNotice error={query.error} retry={refresh} />}
        <section className="public-card">
          <h2>Resumo do pedido</h2>
          <ul className="public-order-snapshots">{data.items.map((item, index) =>
            <li key={index}>
              <div><strong>{item.quantity}× {item.productName}</strong><span>{formatCatalogMoney(item.subtotal)}</span></div>
              {item.addons.length > 0 && <ul>{item.addons.map((addon, addonIndex) => <li key={addonIndex}>{addon.quantity}× {addon.addonName} · {formatCatalogMoney(addon.subtotal)}</li>)}</ul>}
            </li>
          )}</ul>
          <dl className="public-detail-list">
            <div><dt>Subtotal</dt><dd>{formatCatalogMoney(data.order.subtotal)}</dd></div>
            <div><dt>Taxa de entrega</dt><dd>{formatCatalogMoney(data.order.deliveryFee)}</dd></div>
            <div><dt>Total confirmado</dt><dd><strong>{formatCatalogMoney(data.order.total)}</strong></dd></div>
            <div><dt>Modalidade</dt><dd>Retirada no local</dd></div>
            <div><dt>Pagamento</dt><dd><strong>{paymentLabels[data.order.paymentStatus]}</strong></dd></div>
            <div><dt>Pedido criado em</dt><dd>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(data.order.createdAt))}</dd></div>
          </dl>
        </section>
        {cancellable && <section className="public-card public-order-cancel-action">
          <h2>Precisa cancelar?</h2>
          <p>O restaurante confirmará se o estado atual ainda permite o cancelamento. Pedidos pagos não podem ser cancelados por aqui.</p>
          <button className="public-secondary" ref={action} disabled={busy || confirm} onClick={() => setConfirm(true)}>Cancelar pedido</button>
        </section>}
      </div>}
    {success && !query.loading && <p className="public-success" role="status">Pedido cancelado. Este mesmo link continua disponível para consulta.</p>}
    {error !== undefined && <ErrorNotice error={error instanceof ApiError && [400, 404].includes(error.status) ? new Error("Pedido não encontrado ou link inválido.") : error} />}
    {confirm && <div className="public-confirm-backdrop"><div className="public-card public-confirm" role="alertdialog" aria-modal="true" aria-labelledby="order-cancel-title" aria-describedby="order-cancel-description" tabIndex={-1} ref={dialog} onKeyDown={event => {
      if (event.key === "Escape" && !busy) { setConfirm(false); action.current?.focus(); }
      if (event.key === "Tab") {
        const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
        if (!buttons?.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }}>
      <h2 id="order-cancel-title">Cancelar este pedido?</h2>
      <p id="order-cancel-description">O cancelamento depende do estado atual e não pode ser desfeito.</p>
      <div className="public-confirm-actions">
        <button className="public-secondary" disabled={busy} onClick={() => setConfirm(false)}>Manter pedido</button>
        <button className="public-primary" disabled={busy} onClick={() => void cancel()}>{busy ? "Cancelando…" : "Sim, cancelar pedido"}</button>
      </div>
    </div></div>}
  </PublicFrame>;
}
