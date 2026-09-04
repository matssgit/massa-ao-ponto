import { useCallback, useState } from "react";
import { CatalogConfirm } from "./catalog-confirm";
import { AddonForm, CategoryForm, ProductForm } from "./catalog-forms";
import { formatCatalogMoney } from "./catalog-money";
import { CatalogService, type Addon, type Category, type Product } from "./catalog-service";
import { useCatalogMutation } from "./use-catalog-mutation";
import { useCatalogQuery } from "./use-catalog-query";

function Notice({ notice }: { notice: { error: boolean; text: string } | null }) {
  return notice ? <p className={notice.error ? "error" : "catalog-success"} role={notice.error ? "alert" : "status"}>{notice.text}</p> : null;
}

export function CategoriesSection({ service, restaurantId }: { service: CatalogService; restaurantId: string }) {
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const load = useCallback((signal: AbortSignal) => service.listCategories(restaurantId, signal), [service, restaurantId]);
  const { state, reload } = useCatalogQuery(`${restaurantId}:categories`, load);
  const mutation = useCatalogMutation(reload);
  return <section className="catalog-section" aria-labelledby="categories-title">
    <div className="catalog-section-heading"><div><h2 id="categories-title">Categorias</h2><p>Organize a ordem e a disponibilidade das seções do cardápio.</p></div><button className="secondary" onClick={reload}>Atualizar</button></div>
    <Notice notice={mutation.notice} />
    {state.status === "loading" && <p role="status" className="catalog-feedback">Carregando categorias…</p>}
    {state.status === "error" && <div className="catalog-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar categorias novamente</button></div>}
    {state.status === "success" && <div className="catalog-workspace"><div>
      {state.data.length === 0 ? <p role="status" className="catalog-feedback">Nenhuma categoria cadastrada.</p> : <table className="catalog-table" aria-label="Categorias do cardápio"><thead><tr><th>Categoria</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead><tbody>{state.data.map((item) => <tr key={item.id}><th scope="row"><strong>{item.name}</strong><span>{item.description ?? "Sem descrição"}</span></th><td data-label="Ordem">{item.displayOrder}</td><td data-label="Status">{item.active ? "Ativa" : "Inativa"}</td><td><div className="catalog-row-actions"><button className="secondary" disabled={mutation.busy} onClick={() => { setEditing(item); setDeleting(null); }}>Editar</button><button className="secondary" disabled={mutation.busy} onClick={() => void mutation.run(item.active ? "Categoria desativada." : "Categoria ativada.", () => service.toggleCategory(restaurantId, item.id))}>{item.active ? "Desativar" : "Ativar"}</button><button className="danger-link" disabled={mutation.busy} onClick={() => { setDeleting(item); setEditing(null); }}>Excluir</button></div>{deleting?.id === item.id && <CatalogConfirm name={item.name} busy={mutation.busy} onCancel={() => setDeleting(null)} onConfirm={() => void mutation.run("Categoria excluída.", () => service.deleteCategory(restaurantId, item.id)).then((ok) => { if (ok) setDeleting(null); })} />}</td></tr>)}</tbody></table>}
    </div><CategoryForm key={editing?.id ?? "new-category"} item={editing ?? undefined} busy={mutation.busy} onCancel={editing ? () => setEditing(null) : undefined} onSubmit={(value) => mutation.run(editing ? "Categoria atualizada." : "Categoria criada.", () => service.saveCategory(restaurantId, value, editing?.id)).then((ok) => { if (ok) setEditing(null); return ok; })} /></div>}
  </section>;
}

function ProductAddonsPanel({ service, restaurantId, product, addons, onClose }: {
  service: CatalogService; restaurantId: string; product: Product; addons: Addon[]; onClose: () => void;
}) {
  const load = useCallback((signal: AbortSignal) => service.listProductAddons(restaurantId, product.id, signal), [service, restaurantId, product.id]);
  const { state, reload } = useCatalogQuery(`${restaurantId}:${product.id}:addons`, load);
  const mutation = useCatalogMutation(reload);
  const assigned = state.status === "success" ? new Set(state.data.map((item) => item.id)) : new Set<string>();
  return <section className="catalog-associations" aria-label={`Adicionais de ${product.name}`}><div className="catalog-section-heading"><div><h3>Adicionais de {product.name}</h3><p>Marque somente os adicionais permitidos para este produto.</p></div><button className="secondary" onClick={onClose}>Fechar</button></div><Notice notice={mutation.notice} />
    {state.status === "loading" && <p role="status">Carregando associações…</p>}
    {state.status === "error" && <div><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar novamente</button></div>}
    {state.status === "success" && (addons.length === 0 ? <p role="status">Cadastre adicionais antes de associá-los.</p> : <div className="catalog-checks">{addons.map((addon) => <label key={addon.id}><input type="checkbox" checked={assigned.has(addon.id)} disabled={mutation.busy} onChange={(event) => void mutation.run(event.target.checked ? "Adicional associado." : "Associação removida.", () => service.setProductAddon(restaurantId, product.id, addon.id, event.target.checked))} /><span>{addon.name}<small>{formatCatalogMoney(addon.price)} · {addon.active ? "ativo" : "inativo"}</small></span></label>)}</div>)}
  </section>;
}

export function ProductsSection({ service, restaurantId }: { service: CatalogService; restaurantId: string }) {
  const [editing, setEditing] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [associating, setAssociating] = useState<Product | null>(null);
  const load = useCallback(async (signal: AbortSignal) => {
    const [products, categories, addons] = await Promise.all([service.listProducts(restaurantId, signal), service.listCategories(restaurantId, signal), service.listAddons(restaurantId, signal)]);
    return { products, categories, addons };
  }, [service, restaurantId]);
  const { state, reload } = useCatalogQuery(`${restaurantId}:products`, load);
  const mutation = useCatalogMutation(reload);
  return <section className="catalog-section" aria-labelledby="products-title">
    <div className="catalog-section-heading"><div><h2 id="products-title">Produtos</h2><p>Preço, categoria, ordem e disponibilidade para venda.</p></div><button className="secondary" onClick={reload}>Atualizar</button></div><Notice notice={mutation.notice} />
    {state.status === "loading" && <p role="status" className="catalog-feedback">Carregando produtos…</p>}
    {state.status === "error" && <div className="catalog-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar produtos novamente</button></div>}
    {state.status === "success" && <><div className="catalog-workspace"><div>
      {state.data.products.length === 0 ? <p role="status" className="catalog-feedback">Nenhum produto cadastrado.</p> : <table className="catalog-table" aria-label="Produtos do cardápio"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead><tbody>{state.data.products.map((item) => { const category = state.data.categories.find(({ id }) => id === item.categoryId); return <tr key={item.id}><th scope="row"><strong>{item.name}</strong><span>{item.description ?? "Sem descrição"} · ordem {item.displayOrder}</span></th><td data-label="Categoria">{category?.name ?? "Categoria indisponível"}</td><td data-label="Preço">{formatCatalogMoney(item.price)}</td><td data-label="Status">{item.active ? "Ativo" : "Inativo"}</td><td><div className="catalog-row-actions"><button className="secondary" disabled={mutation.busy} onClick={() => { setEditing(item); setDeleting(null); }}>Editar</button><button className="secondary" disabled={mutation.busy} onClick={() => setAssociating(item)}>Adicionais</button><button className="secondary" disabled={mutation.busy} onClick={() => void mutation.run(item.active ? "Produto desativado." : "Produto ativado.", () => service.toggleProduct(restaurantId, item.id))}>{item.active ? "Desativar" : "Ativar"}</button><button className="danger-link" disabled={mutation.busy} onClick={() => { setDeleting(item); setEditing(null); }}>Excluir</button></div>{deleting?.id === item.id && <CatalogConfirm name={item.name} busy={mutation.busy} onCancel={() => setDeleting(null)} onConfirm={() => void mutation.run("Produto excluído.", () => service.deleteProduct(restaurantId, item.id)).then((ok) => { if (ok) setDeleting(null); })} />}</td></tr>; })}</tbody></table>}
    </div><ProductForm key={editing?.id ?? "new-product"} item={editing ?? undefined} categories={state.data.categories} busy={mutation.busy} onCancel={editing ? () => setEditing(null) : undefined} onSubmit={(value) => mutation.run(editing ? "Produto atualizado." : "Produto criado.", () => service.saveProduct(restaurantId, value, editing?.id)).then((ok) => { if (ok) setEditing(null); return ok; })} /></div>
    {associating && <ProductAddonsPanel key={associating.id} service={service} restaurantId={restaurantId} product={associating} addons={state.data.addons} onClose={() => setAssociating(null)} />}</>}
  </section>;
}

export function AddonsSection({ service, restaurantId }: { service: CatalogService; restaurantId: string }) {
  const [editing, setEditing] = useState<Addon | null>(null);
  const [deleting, setDeleting] = useState<Addon | null>(null);
  const load = useCallback((signal: AbortSignal) => service.listAddons(restaurantId, signal), [service, restaurantId]);
  const { state, reload } = useCatalogQuery(`${restaurantId}:addons`, load);
  const mutation = useCatalogMutation(reload);
  return <section className="catalog-section" aria-labelledby="addons-title">
    <div className="catalog-section-heading"><div><h2 id="addons-title">Adicionais</h2><p>Complementos disponíveis para associação aos produtos.</p></div><button className="secondary" onClick={reload}>Atualizar</button></div><Notice notice={mutation.notice} />
    {state.status === "loading" && <p role="status" className="catalog-feedback">Carregando adicionais…</p>}
    {state.status === "error" && <div className="catalog-feedback"><p role="alert">{state.message}</p><button className="secondary" onClick={reload}>Tentar carregar adicionais novamente</button></div>}
    {state.status === "success" && <div className="catalog-workspace"><div>
      {state.data.length === 0 ? <p role="status" className="catalog-feedback">Nenhum adicional cadastrado.</p> : <table className="catalog-table" aria-label="Adicionais do cardápio"><thead><tr><th>Adicional</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead><tbody>{state.data.map((item) => <tr key={item.id}><th scope="row"><strong>{item.name}</strong><span>{item.description ?? "Sem descrição"}</span></th><td data-label="Preço">{formatCatalogMoney(item.price)}</td><td data-label="Status">{item.active ? "Ativo" : "Inativo"}</td><td><div className="catalog-row-actions"><button className="secondary" disabled={mutation.busy} onClick={() => { setEditing(item); setDeleting(null); }}>Editar</button><button className="secondary" disabled={mutation.busy} onClick={() => void mutation.run(item.active ? "Adicional desativado." : "Adicional ativado.", () => service.toggleAddon(restaurantId, item.id))}>{item.active ? "Desativar" : "Ativar"}</button><button className="danger-link" disabled={mutation.busy} onClick={() => { setDeleting(item); setEditing(null); }}>Excluir</button></div>{deleting?.id === item.id && <CatalogConfirm name={item.name} busy={mutation.busy} onCancel={() => setDeleting(null)} onConfirm={() => void mutation.run("Adicional excluído.", () => service.deleteAddon(restaurantId, item.id)).then((ok) => { if (ok) setDeleting(null); })} />}</td></tr>)}</tbody></table>}
    </div><AddonForm key={editing?.id ?? "new-addon"} item={editing ?? undefined} busy={mutation.busy} onCancel={editing ? () => setEditing(null) : undefined} onSubmit={(value) => mutation.run(editing ? "Adicional atualizado." : "Adicional criado.", () => service.saveAddon(restaurantId, value, editing?.id)).then((ok) => { if (ok) setEditing(null); return ok; })} /></div>}
  </section>;
}
