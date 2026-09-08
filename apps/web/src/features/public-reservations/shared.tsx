import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ApiError } from "../../lib/api-client";
import "./public-reservations.css";

export function publicError(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente.";
  if (error.status === 429) return `Muitas tentativas. ${error.retryAfterSeconds === undefined ? "Aguarde um pouco antes de tentar novamente." : `Tente novamente em ${error.retryAfterSeconds} segundos.`}`;
  if (error.code === "RESERVATION_CANCELLATION_WINDOW_EXPIRED") return `O cancelamento exige mais de duas horas de antecedência. ${error.message}`;
  if (error.code === "INVALID_RESERVATION_STATUS_TRANSITION") return `O estado atual não permite cancelar. ${error.message}`;
  if (error.code === "INVALID_ORDER_STATUS_TRANSITION") return `O estado atual não permite cancelar este pedido. ${error.message}`;
  if (error.code === "PAID_ORDER_CANNOT_BE_CANCELLED") return `Pedidos pagos não podem ser cancelados por aqui. ${error.message}`;
  return error.message;
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.focus(); }, [error]);
  return <div className="public-error" role="alert" tabIndex={-1} ref={ref}><p>{publicError(error)}</p>{retry && <button onClick={retry}>Tentar novamente</button>}</div>;
}
export function PublicFrame({ children, slug, page = "reservations" }: { children: ReactNode; slug?: string | null; page?: "reservations" | "catalog" | "order" }) {
  useEffect(() => {
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.getAttribute("content");
    document.title = page === "catalog" ? "Massa ao Ponto · Cardápio" : page === "order" ? "Massa ao Ponto · Pedido" : "Massa ao Ponto · Reservas";
    description?.setAttribute("content", page === "catalog" ? "Conheça o cardápio do restaurante." : page === "order" ? "Faça e acompanhe seu pedido para retirada." : "Encontre sua mesa e acompanhe sua reserva.");
    return () => { document.title = previousTitle; if (previousDescription !== null && previousDescription !== undefined) description?.setAttribute("content", previousDescription); };
  }, [page]);
  return <div className="public-site"><header className="public-header">{slug ? <Link to={"/r/" + encodeURIComponent(slug)} className="public-brand">Massa <span>ao Ponto</span></Link> : <span className="public-brand">Massa <span>ao Ponto</span></span>}<span>À mesa, juntos.</span></header><main id="public-main" className="public-main">{children}</main><footer className="public-footer">Massa ao Ponto <span>Um lugar para bons encontros.</span></footer></div>;
}
export function usePublicQuery<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    load(controller.signal).then(data => { if (!controller.signal.aborted) setState({ data, loading: false }); }).catch(error => { if (!controller.signal.aborted) setState({ error, loading: false }); });
    return () => controller.abort();
  }, [load, revision]);
  return { ...state, reload: () => setRevision(value => value + 1) };
}
export function PublicMissing({ reservation = false, order = false }: { reservation?: boolean; order?: boolean }) {
  const access = reservation || order;
  const invalidTitle = order ? "Pedido não encontrado ou link inválido." : "Reserva não encontrada ou link inválido.";
  return <section className="public-card"><p className="public-eyebrow">{access ? `Seu link de ${order ? "pedido" : "reserva"}` : "404 · Restaurante indisponível"}</p><h1>{access ? invalidTitle : "Não encontramos este restaurante."}</h1><p>{access ? "Confira se você abriu o link completo recebido ao confirmar." : "Confira o endereço ou entre em contato com o restaurante."}</p></section>;
}
export const statusLabels = { SCHEDULED: "Agendada", CONFIRMED: "Confirmada", CANCELLED: "Cancelada", FINISHED: "Finalizada", NO_SHOW: "Não compareceu" };
export const orderStatusLabels = { PENDING: "Pedido recebido", CONFIRMED: "Confirmado", PREPARING: "Em preparo", READY: "Pronto para retirada", OUT_FOR_DELIVERY: "Em andamento", DELIVERED: "Concluído", CANCELLED: "Cancelado" };
