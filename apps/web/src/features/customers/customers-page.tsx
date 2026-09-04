import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/auth-state";
import { useRestaurant } from "../auth/restaurant-state";
import { CustomerDetails } from "./customer-details";
import { CustomersList } from "./customers-list";
import { CustomersSearch } from "./customers-search";
import { CustomersService, type CustomerFilters } from "./customers-service";
import { useCustomersQuery } from "./use-customers-query";
import "./customers.css";

function RestaurantCustomers({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new CustomersService(auth.client), [auth.client]);
  const [filters, setFilters] = useState<CustomerFilters>({ page: 1, limit: 20 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback((signal: AbortSignal) => service.list(restaurantId, filters, signal), [service, restaurantId, filters]);
  const { state, reload } = useCustomersQuery(`${restaurantId}:${JSON.stringify(filters)}`, load);
  useEffect(() => { if (!selectedId) heading.current?.focus(); }, [selectedId]);

  return <section className="customers-page">
    <header className="customers-heading"><div><p className="eyebrow">RELACIONAMENTO DA CASA</p><h1 ref={heading} tabIndex={-1}>Clientes</h1></div>
      {!selectedId && <button className="secondary" onClick={reload}>Atualizar clientes</button>}
    </header>
    <div hidden={selectedId !== null}>
      <CustomersSearch onApply={setFilters} />
      {state.status === "loading" && <p className="customers-feedback" role="status">Carregando clientes…</p>}
      {state.status === "error" && <div className="customers-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar clientes novamente</button></div>}
      {state.status === "success" && <CustomersList result={state.data} search={filters.search} onSelect={setSelectedId} onPage={(page) => setFilters((current) => ({ ...current, page }))} />}
    </div>
    {selectedId && <CustomerDetails key={selectedId} service={service} restaurantId={restaurantId} customerId={selectedId} onBack={() => setSelectedId(null)} />}
  </section>;
}

export function CustomersPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!restaurantId || !membership) return null;
  return <RestaurantCustomers key={restaurantId} restaurantId={restaurantId} />;
}
