import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/auth-state";
import { isOwner, useRestaurant } from "../auth/restaurant-state";
import { OrderDetails } from "./order-details";
import { OrdersFilters } from "./orders-filters";
import { OrdersList } from "./orders-list";
import { OrdersService, type OrdersFiltersValue } from "./orders-service";
import { useOrdersQuery } from "./use-orders-query";
import "./orders.css";

function RestaurantOrders({ restaurantId, owner }: { restaurantId: string; owner: boolean }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new OrdersService(auth.client), [auth.client]);
  const [filters, setFilters] = useState<OrdersFiltersValue>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback((signal: AbortSignal) => service.list(restaurantId, filters, signal), [service, restaurantId, filters]);
  const { state, reload } = useOrdersQuery(`${restaurantId}:${JSON.stringify(filters)}`, load);
  useEffect(() => { if (!selected) heading.current?.focus(); }, [selected]);

  return <section className="orders-page">
    <header className="orders-heading"><div><p className="eyebrow">OPERAÇÃO DA CASA</p><h1 ref={heading} tabIndex={-1}>Pedidos</h1></div>
      {!selected && <button className="secondary" onClick={reload}>Atualizar listagem</button>}
    </header>
    <div hidden={selected !== null}>
      <OrdersFilters onApply={setFilters} />
      {state.status === "loading" && <p className="orders-feedback" role="status">Carregando pedidos…</p>}
      {state.status === "error" && <div className="orders-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar pedidos novamente</button></div>}
      {state.status === "success" && <OrdersList result={state.data} onSelect={setSelected} onPage={(page) => setFilters((current) => ({ ...current, page }))} />}
    </div>
    {selected && <OrderDetails key={selected} service={service} restaurantId={restaurantId} orderId={selected} owner={owner} onBack={() => setSelected(null)} onChanged={reload} />}
  </section>;
}

export function OrdersPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!restaurantId) return null;
  return <RestaurantOrders key={restaurantId} restaurantId={restaurantId} owner={isOwner(membership)} />;
}
