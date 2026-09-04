import { useCallback, useEffect, useRef } from "react";
import { customerEmail, formatCustomerPhone } from "./customer-labels";
import { CustomersService } from "./customers-service";
import { useCustomersQuery } from "./use-customers-query";

export function CustomerDetails({ service, restaurantId, customerId, onBack }: {
  service: CustomersService;
  restaurantId: string;
  customerId: string;
  onBack: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback((signal: AbortSignal) => service.detail(restaurantId, customerId, signal), [service, restaurantId, customerId]);
  const { state, reload } = useCustomersQuery(`${restaurantId}:${customerId}`, load);
  useEffect(() => { heading.current?.focus(); }, []);

  return <section className="customer-detail" aria-labelledby="customer-detail-title">
    <header className="customers-heading"><div>
      <button className="secondary" onClick={onBack}>Voltar aos clientes</button>
      <h2 ref={heading} tabIndex={-1} id="customer-detail-title">Detalhe do cliente</h2>
      <p className="customer-id">{customerId}</p>
    </div><button className="secondary" onClick={reload}>Atualizar detalhe</button></header>
    {state.status === "loading" && <p role="status">Carregando cliente…</p>}
    {state.status === "error" && <div className="customers-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar cliente novamente</button></div>}
    {state.status === "success" && <section className="customer-panel" aria-label="Dados do cliente">
      <p className="eyebrow">CADASTRO RELACIONADO</p>
      <h3>{state.data.name}</h3>
      <dl className="customer-facts">
        <div><dt>Telefone</dt><dd><a href={`tel:${state.data.phone}`}>{formatCustomerPhone(state.data.phone)}</a></dd></div>
        <div><dt>E-mail</dt><dd>{state.data.email ? <a href={`mailto:${state.data.email}`}>{state.data.email}</a> : customerEmail(state.data.email)}</dd></div>
      </dl>
      <p className="customer-scope-note">Este cadastro aparece porque possui pedido ou reserva relacionado ao restaurante atual.</p>
    </section>}
  </section>;
}
