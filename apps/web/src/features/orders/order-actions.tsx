import { useState } from "react";
import type { OrderAction, OrderDetail, OrderStatus } from "./orders-service";

export function availableActions({ order, delivery }: OrderDetail, owner: boolean) {
  const actions: { label: string; action: OrderAction }[] = [];
  const next: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
    PENDING: { status: "CONFIRMED", label: "Confirmar pedido" },
    CONFIRMED: { status: "PREPARING", label: "Iniciar preparo" },
    PREPARING: { status: "READY", label: "Marcar como pronto" },
  };
  const transition = next[order.status];
  if (transition) actions.push({ label: transition.label, action: { kind: "status", status: transition.status } });
  if (order.status === "READY" && order.type !== "DELIVERY") {
    actions.push({ label: "Concluir pedido", action: { kind: "status", status: "DELIVERED" } });
  }
  if (owner && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && order.status !== "DELIVERED") {
    actions.push({ label: "Registrar pagamento", action: { kind: "payment" } });
  }
  if (order.paymentStatus === "PENDING" && (order.status === "PENDING" || order.status === "CONFIRMED")) {
    actions.push({ label: "Cancelar pedido", action: { kind: "cancel" } });
  }
  if (order.type === "DELIVERY") {
    if (!delivery && (order.status === "PREPARING" || order.status === "READY") && order.deliveryStreet && order.deliveryNeighborhood && order.deliveryCity) {
      actions.push({ label: "Criar entrega", action: { kind: "create-delivery" } });
    }
    if (delivery?.status === "PENDING" && order.status === "READY") {
      actions.push({ label: "Iniciar entrega", action: { kind: "start-delivery" } });
    }
    if (delivery?.status === "OUT_FOR_DELIVERY" && order.status === "OUT_FOR_DELIVERY") {
      actions.push({ label: "Concluir entrega", action: { kind: "complete-delivery" } });
    }
  }
  return actions;
}

export function OrderActions({ detail, owner, busy, onAction }: {
  detail: OrderDetail; owner: boolean; busy: boolean; onAction: (action: OrderAction) => void;
}) {
  const [confirmation, setConfirmation] = useState<OrderAction | null>(null);
  const actions = availableActions(detail, owner);
  const permittedConfirmation = confirmation && actions.some(({ action }) => action.kind === confirmation.kind) ? confirmation : null;
  return <section className="order-actions" aria-label="Ações do pedido" aria-busy={busy}>
    <h3>Operar pedido</h3>
    {detail.order.paymentStatus === "PAID" && <p className="muted">Pagamento confirmado. Cancelamento não disponível; não há estorno neste fluxo.</p>}
    {detail.order.paymentStatus === "PENDING" && <p className="muted">Pagamento pendente. Não é possível confirmar pagamento após concluir o pedido.{!owner && " Somente um proprietário pode confirmar o pagamento."}</p>}
    {actions.length === 0 && <p>Nenhuma ação disponível no estado atual.</p>}
    <div className="order-action-buttons">{actions.map(({ label, action }) => <button
      key={action.kind} className={action.kind === "status" ? "primary" : "secondary"}
      disabled={busy || permittedConfirmation !== null}
      onClick={() => {
        if (action.kind === "payment" || action.kind === "cancel") setConfirmation(action);
        else onAction(action);
      }}
    >{label}</button>)}</div>
    {permittedConfirmation && <div className="order-confirmation" role="group" aria-label="Confirmação da ação">
      <p>{permittedConfirmation.kind === "payment" ? "Confirma que o pagamento foi recebido? Esta ação registra o pedido como pago e impede seu cancelamento." : "Confirma o cancelamento deste pedido? Não será possível retomar seu preparo."}</p>
      <button className="primary" disabled={busy} onClick={() => onAction(permittedConfirmation)}>{permittedConfirmation.kind === "payment" ? "Confirmar pagamento" : "Confirmar cancelamento"}</button>
      <button className="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Voltar sem confirmar</button>
    </div>}
    {busy && <p role="status">Enviando ação…</p>}
  </section>;
}
