import { useCallback } from "react";
import { Link } from "react-router";
import { ApiError } from "../../lib/api-client";
import { PublicReservationService } from "./service";
import { ErrorNotice, PublicFrame, PublicMissing, usePublicQuery } from "./shared";
export function PublicRestaurantPage({ service, slug }: { service: PublicReservationService; slug: string }) {
  const query = usePublicQuery(useCallback((signal: AbortSignal) => service.restaurant(slug, signal), [service, slug]));
  return <PublicFrame slug={slug}>{query.loading ? <p role="status">Preparando sua visita…</p> : query.error ? query.error instanceof ApiError && query.error.status === 404 ? <PublicMissing /> : <ErrorNotice error={query.error} retry={query.reload} /> : query.data && <section className="public-hero"><div><p className="public-eyebrow">O próximo encontro começa aqui</p><h1>{query.data.name}</h1><p className="public-intro">Reserve um lugar à mesa.<br />O tempo juntos fica por sua conta.</p><div className="public-hero-actions"><Link className="public-primary" to={`/r/${encodeURIComponent(slug)}/reservar`}>Reservar mesa <span aria-hidden="true">↗</span></Link><Link className="public-secondary" to={`/r/${encodeURIComponent(slug)}/cardapio`}>Ver cardápio</Link></div><div className="public-location"><p>{query.data.address}</p>{query.data.phone && <p>{query.data.phone}</p>}</div></div><div className="public-illustration" aria-hidden="true"><div className="public-plate"><span>Boas conversas.<br />Bons encontros.</span></div><span className="public-note">Seu lugar à mesa.</span></div></section>}</PublicFrame>;
}
