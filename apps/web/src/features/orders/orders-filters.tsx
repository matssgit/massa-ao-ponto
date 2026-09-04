import { useState, type FormEvent } from "react";
import { customPeriod } from "../dashboard/period";
import { orderStatusSchema, orderTypeSchema, type OrdersFiltersValue } from "./orders-service";
import { statusLabels, typeLabels } from "./order-labels";

export function OrdersFilters({ onApply }: { onApply: (filters: OrdersFiltersValue) => void }) {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [limit, setLimit] = useState(20);
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const period = start || end ? customPeriod(start, end) : {};
      onApply({
        page: 1, limit, ...period,
        status: status ? orderStatusSchema.parse(status) : undefined,
        type: type ? orderTypeSchema.parse(type) : undefined,
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Filtros inválidos.");
    }
  }

  function clear() {
    setStatus(""); setType(""); setStart(""); setEnd(""); setLimit(20); setError(null);
    onApply({ page: 1, limit: 20 });
  }

  return <form className="orders-filters" onSubmit={submit} aria-label="Filtros de pedidos">
    <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>
      <option value="">Todos os status</option>
      {orderStatusSchema.options.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}
    </select></label>
    <label>Tipo<select value={type} onChange={(event) => setType(event.target.value)}>
      <option value="">Todos os tipos</option>
      {orderTypeSchema.options.map((value) => <option key={value} value={value}>{typeLabels[value]}</option>)}
    </select></label>
    <label>Criados de<input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
    <label>Até<input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
    <label>Por página<select value={limit} onChange={(event) => setLimit(Number(event.target.value))}>
      {[20, 50, 100].map((value) => <option key={value} value={value}>{value}</option>)}
    </select></label>
    <button className="primary" type="submit">Aplicar filtros</button>
    <button className="secondary" type="button" onClick={clear}>Limpar</button>
    <p className="orders-filter-note">Período de criação, incluindo o último dia. Fuso do dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Alterações são aplicadas pelo botão.</p>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}
