import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../../lib/api-client";
import { OrderActions } from "./order-actions";
import { OrderHistory } from "./order-history";
import { dateTime, money, statusLabels, typeLabels } from "./order-labels";
import { OrdersService, type OrderAction } from "./orders-service";
import { useOrdersQuery } from "./use-orders-query";

export function OrderDetails({ service, restaurantId, orderId, owner, onBack, onChanged }: {
  service: OrdersService; restaurantId: string; orderId: string; owner: boolean;
  onBack: () => void; onChanged: () => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.detail(restaurantId, orderId, signal), [service, restaurantId, orderId]);
  const { state, reload } = useOrdersQuery(`${restaurantId}:${orderId}`, load);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);
  const pending = useRef(false);
  const alive = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    alive.current = true;
    heading.current?.focus();
    return () => { alive.current = false; };
  }, []);

  async function act(action: OrderAction) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setNotice(null);
    try {
      await service.mutate(restaurantId, orderId, action);
      if (alive.current) setNotice({ error: false, text: "Ação concluída. Atualizando dados do servidor." });
    } catch (error) {
      if (alive.current) {
        const ambiguous = !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.code === "INVALID_RESPONSE";
        setNotice({ error: true, text: ambiguous
          ? "Não foi possível confirmar o resultado da ação. Confira os dados atualizados antes de tentar novamente."
          : `${error.message} (${error.code})` });
      }
    } finally {
      pending.current = false;
      if (alive.current) {
        setBusy(false);
        // Mesmo uma falha de transporte pode ocorrer após a escrita no servidor.
        reload();
        onChanged();
      }
    }
  }

  return <section className="order-detail" aria-labelledby="order-detail-title">
    <header className="orders-heading">
      <div><button className="secondary" disabled={busy} onClick={onBack}>Voltar aos pedidos</button><h2 ref={heading} tabIndex={-1} id="order-detail-title">Pedido #{orderId.slice(0, 8)}</h2><p className="orders-id">{orderId}</p></div>
      <button className="secondary" disabled={busy} onClick={reload}>Atualizar detalhe</button>
    </header>
    {notice && <p className={notice.error ? "error" : "order-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p>}
    {state.status === "loading" && <p role="status">Carregando detalhe do pedido…</p>}
    {state.status === "error" && <div className="orders-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar detalhe novamente</button></div>}
    {state.status === "success" && <>
      <div className="order-detail-grid">
        <section className="order-panel" aria-label="Resumo do pedido"><h3>{state.data.order.customerName}</h3>
          <p>{state.data.order.customerPhone}</p>
          <dl className="order-facts">
            <div><dt>Tipo</dt><dd>{typeLabels[state.data.order.type]}</dd></div>
            <div><dt>Status</dt><dd>{statusLabels[state.data.order.status]}</dd></div>
            <div><dt>Pagamento</dt><dd>{state.data.order.paymentStatus === "PAID" ? "Pago" : "A pagar"}</dd></div>
            <div><dt>Criado em</dt><dd>{dateTime(state.data.order.createdAt)}</dd></div>
            {state.data.order.tableId && <div><dt>ID da mesa</dt><dd className="orders-id">{state.data.order.tableId}</dd></div>}
            <div><dt>Subtotal</dt><dd>{money(state.data.order.subtotal)}</dd></div>
            <div><dt>Taxa de entrega</dt><dd>{money(state.data.order.deliveryFee)}</dd></div>
            <div><dt>Total</dt><dd className="order-money">{money(state.data.order.total)}</dd></div>
          </dl>
          {state.data.order.observation && <p className="order-observation">Observação: {state.data.order.observation}</p>}
        </section>
        <OrderActions detail={state.data} owner={owner} busy={busy} onAction={(action) => void act(action)} />
      </div>
      <section className="order-panel" aria-label="Itens do pedido"><h3>Itens e adicionais</h3>
        {state.data.items.length === 0 ? <p>Nenhum item retornado.</p> : <ul className="order-items">{state.data.items.map((item) => <li key={item.id}>
          <div className="order-item-heading"><strong>{item.quantity} × {item.productName}</strong><span>{money(item.subtotal)}</span></div>
          <p className="muted">Preço unitário: {money(item.unitPrice)}</p>
          {item.addons.length === 0 ? <p className="muted">Sem adicionais.</p> : <ul>{item.addons.map((addon) => <li key={addon.id}>{addon.quantity} × {addon.addonName} · {money(addon.unitPrice)} por unidade · subtotal {money(addon.subtotal)}</li>)}</ul>}
        </li>)}</ul>}
      </section>
      {state.data.order.type === "DELIVERY" && <section className="order-panel" aria-label="Entrega"><h3>Entrega</h3>
        <p>{[state.data.order.deliveryStreet, state.data.order.deliveryNumber, state.data.order.deliveryComplement, state.data.order.deliveryNeighborhood, state.data.order.deliveryCity, state.data.order.deliveryState, state.data.order.deliveryZipCode].filter(Boolean).join(" · ") || "Endereço não informado."}</p>
        <p>{state.data.delivery ? `Estado da entrega: ${statusLabels[state.data.delivery.status]}` : "Entrega ainda não criada."}</p>
        {state.data.delivery && <OrderHistory title="Histórico da entrega" entries={state.data.delivery.history} />}
      </section>}
      <OrderHistory title="Histórico do pedido" entries={state.data.history} />
    </>}
  </section>;
}
