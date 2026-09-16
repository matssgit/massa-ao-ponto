import { weekdayLabels, type OperatingHours, type OperationalOverride } from "../../lib/operating-hours";
import "./operating-hours.css";

export function OperatingHoursSummary({ hours, open, override }: { hours: OperatingHours; open: boolean; override: OperationalOverride }) {
  return <section className="public-hours" aria-labelledby="public-hours-title">
    <div><h2 id="public-hours-title">Horários</h2><p className={open ? "public-open-status" : "public-closed-status"} role="status">{override === "CLOSED" ? "Temporariamente fechado" : open ? "Aberto agora" : "Fechado agora"}</p></div>
    {!hours.configured ? <p>Horários ainda não informados. Consulte o restaurante antes da visita.</p> : <dl>{hours.days.map(day => <div key={day.dayOfWeek}><dt>{weekdayLabels[day.dayOfWeek]}</dt><dd>{day.active ? `${day.opensAt}–${day.closesAt}` : "Fechado"}</dd></div>)}</dl>}
  </section>;
}
