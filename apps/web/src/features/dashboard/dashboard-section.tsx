import { useId, type ReactNode } from "react";
import type { SectionState } from "./use-dashboard-section";

export function DashboardSection<T>({ title, description, state, retry, children, className = "" }: {
  title: string; description: string; state: SectionState<T>; retry: () => void;
  children: (data: T) => ReactNode; className?: string;
}) {
  const titleId = useId();
  return <section className={`dashboard-section ${className}`} aria-labelledby={titleId} aria-busy={state.status === "loading"}>
    <header><h2 id={titleId}>{title}</h2><p>{description}</p></header>
    {state.status === "loading" ? <div className="dashboard-loading" role="status">Carregando {title.toLocaleLowerCase("pt-BR")}…<span aria-hidden="true" /><span aria-hidden="true" /></div>
      : state.status === "error" ? <div className="dashboard-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={retry}>Tentar novamente <span className="dashboard-sr-only">— {title}</span></button></div>
      : children(state.data)}
  </section>;
}

export function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="metric-card"><dt>{label}</dt><dd>{value}</dd><p>{detail}</p></div>;
}

export function DashboardEmpty({ children }: { children: ReactNode }) {
  return <p className="dashboard-empty">{children}</p>;
}
