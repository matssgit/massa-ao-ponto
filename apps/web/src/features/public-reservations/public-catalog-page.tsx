import { useCallback } from "react";
import { Link } from "react-router";
import { formatCatalogMoney } from "../catalog/catalog-money";
import { ApiError } from "../../lib/api-client";
import { PublicReservationService } from "./service";
import { ErrorNotice, PublicFrame, PublicMissing, usePublicQuery } from "./shared";

export function PublicCatalogPage({ service, slug }: { service: PublicReservationService; slug: string }) {
  const query = usePublicQuery(useCallback((signal: AbortSignal) => service.catalog(slug, signal), [service, slug]));
  return <PublicFrame slug={slug} page="catalog">
    <Link className="public-back" to={`/r/${encodeURIComponent(slug)}`}>← Voltar ao restaurante</Link>
    {query.loading ? <p role="status">Preparando o cardápio…</p> : query.error
      ? query.error instanceof ApiError && query.error.status === 404
        ? <PublicMissing />
        : <ErrorNotice error={query.error} retry={query.reload} />
      : query.data && <section className="public-menu" aria-labelledby="public-menu-title">
        <header className="public-page-title">
          <p className="public-eyebrow">Sabores da casa</p>
          <h1 id="public-menu-title">Cardápio</h1>
          <p className="public-intro">Escolha com calma. Os preços e adicionais disponíveis estão indicados em cada item.</p>
          <Link className="public-primary public-menu-order-cta" to={`/r/${encodeURIComponent(slug)}/pedido`}>Fazer pedido para retirada</Link>
        </header>
        {query.data.categories.length === 0
          ? <div className="public-card public-menu-empty"><h2>Cardápio em preparação.</h2><p>O restaurante ainda não publicou itens por aqui.</p></div>
          : <div className="public-menu-categories">{query.data.categories.map(category =>
            <section className="public-menu-category" key={category.id} aria-labelledby={`category-${category.id}`}>
              <h2 id={`category-${category.id}`}>{category.name}</h2>
              {category.products.length === 0
                ? <p className="public-menu-category-empty">Nenhum item disponível nesta categoria.</p>
                : <div className="public-menu-products">{category.products.map(product =>
                  <article className="public-menu-product" key={product.id}>
                    <div className="public-menu-product-heading"><h3>{product.name}</h3><strong>{formatCatalogMoney(product.price)}</strong></div>
                    {product.description && <p>{product.description}</p>}
                    {product.addons.length > 0 && <div className="public-menu-addons">
                      <h4>Adicionais disponíveis</h4>
                      <ul>{product.addons.map(addon =>
                        <li key={addon.id}><span>{addon.name}{addon.description ? ` — ${addon.description}` : ""}</span><span>+ {formatCatalogMoney(addon.price)}</span></li>
                      )}</ul>
                    </div>}
                  </article>
                )}</div>}
            </section>
          )}</div>}
      </section>}
  </PublicFrame>;
}
