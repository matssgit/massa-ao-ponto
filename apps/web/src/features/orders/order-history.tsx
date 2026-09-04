import { dateTime, statusLabels } from "./order-labels";
import { orderStatusSchema, type HistoryEntry } from "./orders-service";

const actionLabels: Record<string, string> = {
  CREATED: "Pedido criado", ORDER_CREATED: "Pedido criado", STATUS_CHANGED: "Status alterado",
  CANCELLED: "Pedido cancelado", PAYMENT_CONFIRMED: "Pagamento confirmado",
  DELIVERY_CREATED: "Entrega criada", DELIVERY_STARTED: "Entrega iniciada", DELIVERY_COMPLETED: "Entrega concluída",
};
function statusLabel(value: string) {
  const parsed = orderStatusSchema.safeParse(value);
  return parsed.success ? statusLabels[parsed.data] : value;
}

export function OrderHistory({ entries, title }: { entries: HistoryEntry[]; title: string }) {
  return <section className="order-history" aria-label={title}>
    <h3>{title}</h3>
    {entries.length === 0 ? <p className="muted">Nenhum evento registrado.</p> : <ol>{entries.map((entry) => <li key={entry.id}>
      <strong>{actionLabels[entry.action] ?? entry.action}</strong>
      <time dateTime={entry.createdAt}>{dateTime(entry.createdAt)}</time>
      <p>{entry.previousStatus ? `${statusLabel(entry.previousStatus)} → ` : ""}{statusLabel(entry.newStatus)}</p>
      {entry.observation && <p className="muted">{entry.observation}</p>}
    </li>)}</ol>}
  </section>;
}
