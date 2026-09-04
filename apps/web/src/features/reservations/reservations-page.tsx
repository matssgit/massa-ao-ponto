import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/auth-state";
import { useRestaurant } from "../auth/restaurant-state";
import { ReservationDetails } from "./reservation-details";
import { ReservationsFilters } from "./reservations-filters";
import { ReservationsList } from "./reservations-list";
import { ReservationsService, type ReservationFiltersValue, type ReservationListItem } from "./reservations-service";
import { useReservationsQuery } from "./use-reservations-query";
import "./reservations.css";

function RestaurantReservations({ restaurantId, role }: { restaurantId: string; role: "OWNER" | "STAFF" }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new ReservationsService(auth.client), [auth.client]);
  const [filters, setFilters] = useState<ReservationFiltersValue>({ page: 1, limit: 20 });
  const [selected, setSelected] = useState<ReservationListItem | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const load = useCallback((signal: AbortSignal) => service.list(restaurantId, filters, signal), [service, restaurantId, filters]);
  const { state, reload } = useReservationsQuery(`${restaurantId}:${JSON.stringify(filters)}`, load);
  useEffect(() => { if (!selected) heading.current?.focus(); }, [selected]);
  return <section className="reservations-page"><header className="reservations-heading"><div><p className="eyebrow">AGENDA DA CASA</p><h1 ref={heading} tabIndex={-1}>Reservas</h1></div>{!selected && <button className="secondary" onClick={reload}>Atualizar agenda</button>}</header>
    <div hidden={selected !== null}><ReservationsFilters onApply={setFilters} />
      {state.status === "loading" && <p className="reservations-feedback" role="status">Carregando reservas…</p>}
      {state.status === "error" && <div className="reservations-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar reservas novamente</button></div>}
      {state.status === "success" && <ReservationsList result={state.data} onSelect={setSelected} onPage={(page) => setFilters((current) => ({ ...current, page }))} />}
    </div>
    {selected && <ReservationDetails key={selected.reservation.id} service={service} restaurantId={restaurantId} selected={selected} role={role} onBack={() => setSelected(null)} onChanged={reload} />}
  </section>;
}
export function ReservationsPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!restaurantId || !membership) return null;
  return <RestaurantReservations key={restaurantId} restaurantId={restaurantId} role={membership.role} />;
}
