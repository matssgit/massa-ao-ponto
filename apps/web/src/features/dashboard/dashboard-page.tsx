import { useMemo, useState, type FormEvent } from "react";
import { useAuth } from "../auth/auth-state";
import { isOwner, useRestaurant } from "../auth/restaurant-state";
import { DashboardService } from "./dashboard-service";
import { DashboardReports } from "./dashboard-reports";
import { customPeriod, dateInput, formatPeriodDate, presetPeriod, type Preset } from "./period";
import "./dashboard.css";

function OwnerDashboard({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new DashboardService(auth.client), [auth.client]);
  const [preset, setPreset] = useState<Preset | "custom">("today");
  const [period, setPeriod] = useState(() => presetPeriod("today"));
  const [start, setStart] = useState(() => dateInput());
  const [end, setEnd] = useState(() => dateInput());
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  function choose(value: Preset | "custom") {
    setPreset(value); setError(null);
    if (value !== "custom") setPeriod(presetPeriod(value));
  }
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try { setPeriod(customPeriod(start, end)); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Período inválido."); }
  }
  function refresh() {
    if (preset !== "custom") setPeriod(presetPeriod(preset));
    setRevision((value) => value + 1);
  }

  return <section className="dashboard-page">
    <header className="dashboard-heading"><div><p className="eyebrow">ACOMPANHAMENTO DA CASA</p><h1>Visão geral</h1></div><button className="secondary" onClick={refresh}>Atualizar dados</button></header>
    <div className="period-controls"><label htmlFor="dashboard-period">Período</label><select id="dashboard-period" value={preset} onChange={(event) => {
      const value = event.target.value;
      if (value === "today" || value === "7days" || value === "30days" || value === "custom") choose(value);
    }}><option value="today">Hoje</option><option value="7days">Últimos 7 dias</option><option value="30days">Últimos 30 dias</option><option value="custom">Personalizado</option></select>
      {preset === "custom" && <form onSubmit={apply}><label>De<input type="date" value={start} required onChange={(event) => setStart(event.target.value)} /></label><label>Até<input type="date" value={end} required onChange={(event) => setEnd(event.target.value)} /></label><button className="secondary" type="submit">Aplicar período</button></form>}
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    <p className="dashboard-period-caption">Pedidos criados de {formatPeriodDate(period.startsAt)} até {formatPeriodDate(period.endsAt)}.<br />Fuso do dispositivo: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Datas personalizadas são aplicadas pelo botão acima.</p>
    <DashboardReports key={`${restaurantId}:${period.startsAt}:${period.endsAt}:${revision}`} service={service} restaurantId={restaurantId} period={period} />
  </section>;
}

export function DashboardPage() {
  const { membership, restaurantId } = useRestaurant();
  if (!restaurantId || !isOwner(membership)) return <section className="section-page"><h1>Visão geral</h1><p>Os indicadores financeiros estão disponíveis apenas para proprietários. Use o menu para acessar suas atividades operacionais.</p></section>;
  return <OwnerDashboard key={restaurantId} restaurantId={restaurantId} />;
}
