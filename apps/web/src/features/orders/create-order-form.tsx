import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { z } from "zod";
import type { ApiClient } from "../../lib/api-client";
import { ApiError } from "../../lib/api-client";
import { CustomerFields, type CustomerDraft } from "../admin-creation/customer-fields";
import { formatCatalogMoney } from "../catalog/catalog-money";
import { CatalogService, type Addon, type Product } from "../catalog/catalog-service";
import { RestaurantSettingsService, type RestaurantDetails } from "../restaurant-settings/restaurant-settings-service";
import { TablesService, type RestaurantTable } from "../tables/tables-service";
import { createOrderInputSchema, type CreateOrderInput, type Order, type OrderType, type OrdersService, type PaymentMethod } from "./orders-service";
import { paymentMethodLabels } from "./order-labels";
import "../admin-creation/admin-creation.css";

type Line = { product: Product; quantity: number; addons: { addon: Addon; quantity: number }[] };
type Resources = { restaurant: RestaurantDetails; products: Product[]; tables: RestaurantTable[] };
const emptyCustomer: CustomerDraft = { name: "", phone: "", email: "" };
const emptyAddress = { street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" };

function message(cause: unknown) {
  if (cause instanceof z.ZodError) return cause.issues[0]?.message ?? "Revise os dados do pedido.";
  return cause instanceof Error ? cause.message : "Não foi possível criar o pedido.";
}
function uncertain(cause: unknown) {
  return cause instanceof ApiError && (cause.status === 0 || cause.status >= 500 || cause.code === "INVALID_RESPONSE");
}

export function CreateOrderForm({ client, service, restaurantId, onCancel, onCreated, onUncertain }: {
  client: ApiClient;
  service: OrdersService;
  restaurantId: string;
  onCancel: () => void;
  onCreated: (order: Order) => void;
  onUncertain: () => void;
}) {
  const catalog = useMemo(() => new CatalogService(client), [client]);
  const tablesService = useMemo(() => new TablesService(client), [client]);
  const restaurants = useMemo(() => new RestaurantSettingsService(client), [client]);
  const [resources, setResources] = useState<Resources>();
  const [loadError, setLoadError] = useState<string>();
  const [reload, setReload] = useState(0);
  const [type, setType] = useState<OrderType>("PICKUP");
  const [customer, setCustomer] = useState(emptyCustomer);
  const [observation, setObservation] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("PIX");
  const [changeFor, setChangeFor] = useState("");
  const [tableId, setTableId] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [lines, setLines] = useState<Line[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, string>>({});
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [draft, setDraft] = useState<CreateOrderInput>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [isUncertain, setIsUncertain] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setResources(undefined); setLoadError(undefined);
    void Promise.all([
      restaurants.get(restaurantId, controller.signal),
      catalog.listProducts(restaurantId, controller.signal),
      tablesService.list(restaurantId, controller.signal),
    ]).then(([restaurant, products, tables]) => {
      if (!controller.signal.aborted) setResources({ restaurant, products: products.filter((product) => product.active), tables: tables.filter((table) => table.active) });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setLoadError(message(cause));
    });
    return () => controller.abort();
  }, [catalog, restaurantId, restaurants, tablesService, reload]);

  useEffect(() => {
    const controller = new AbortController();
    setAddonQuantities({}); setAddons([]);
    if (!productId) return () => controller.abort();
    setAddonsLoading(true);
    void catalog.listProductAddons(restaurantId, productId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setAddons(result.filter((addon) => addon.active));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(message(cause));
    }).finally(() => { if (!controller.signal.aborted) setAddonsLoading(false); });
    return () => controller.abort();
  }, [catalog, productId, restaurantId]);

  const estimate = lines.reduce((total, line) => total + line.product.price * line.quantity + line.addons.reduce((sum, entry) => sum + entry.addon.price * entry.quantity, 0), 0);
  const fee = type === "DELIVERY" ? resources?.restaurant.deliveryFeeCents ?? 0 : 0;

  function addItem() {
    const product = resources?.products.find((item) => item.id === productId);
    const parsedQuantity = Number(quantity);
    if (!product || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) { setError("Selecione um produto e uma quantidade válida."); return; }
    if (lines.some((line) => line.product.id === product.id)) { setError("O produto já está no pedido. Remova-o antes de adicioná-lo novamente."); return; }
    const selectedAddons = addons.flatMap((addon) => {
      const value = Number(addonQuantities[addon.id] ?? 0);
      return Number.isInteger(value) && value > 0 ? [{ addon, quantity: value }] : [];
    });
    setLines((current) => [...current, { product, quantity: parsedQuantity, addons: selectedAddons }]);
    setProductId(""); setQuantity("1"); setError(undefined);
  }

  function buildInput() {
    const common = {
      customer: { name: customer.name, phone: customer.phone, ...(customer.email.trim() ? { email: customer.email } : {}) },
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity, ...(line.addons.length ? { addons: line.addons.map((entry) => ({ addonId: entry.addon.id, quantity: entry.quantity })) } : {}) })),
      ...(observation.trim() ? { observation } : {}),
      paymentMethod,
      ...(paymentMethod === "CASH" && changeFor.trim() ? { changeForCents: Math.round(Number(changeFor.replace(",", ".")) * 100) } : {}),
    };
    if (type === "DELIVERY") return createOrderInputSchema.parse({ ...common, type, deliveryFee: fee, deliveryAddress: address });
    if (type === "DINE_IN") return createOrderInputSchema.parse({ ...common, type, deliveryFee: 0, tableId });
    return createOrderInputSchema.parse({ ...common, type, deliveryFee: 0 });
  }

  function review(event: FormEvent) {
    event.preventDefault();
    try { setDraft(buildInput()); setError(undefined); }
    catch (cause) { setError(message(cause)); }
  }

  async function submit() {
    if (!draft || submitting.current || isUncertain) return;
    submitting.current = true; setBusy(true); setError(undefined);
    try { onCreated(await service.create(restaurantId, draft)); }
    catch (cause) {
      setError(message(cause));
      if (uncertain(cause)) setIsUncertain(true);
    } finally { submitting.current = false; setBusy(false); }
  }

  if (!resources) return <section className="admin-create-panel" aria-label="Novo pedido">{loadError ? <><p role="alert">{loadError}</p><button className="secondary" onClick={() => setReload((value) => value + 1)}>Tentar carregar formulário novamente</button><button className="secondary" onClick={onCancel}>Fechar</button></> : <p role="status">Preparando formulário do pedido…</p>}</section>;

  return <section className="admin-create-panel" aria-label="Novo pedido"><header><div><p className="eyebrow">ATENDIMENTO MANUAL</p><h2>{draft ? "Revisar pedido" : "Novo pedido"}</h2></div><button className="secondary" disabled={busy} onClick={onCancel}>Fechar</button></header>
    {!draft ? <form onSubmit={review}>
      <fieldset disabled={busy} className="admin-create-fields"><legend>Modalidade</legend><label>Tipo<select value={type} onChange={(event) => { setType(event.target.value as OrderType); setTableId(""); }}><option value="PICKUP">Retirada</option><option value="DELIVERY">Entrega</option><option value="DINE_IN">Mesa</option></select></label>
        {type === "DINE_IN" && <label>Mesa<select required value={tableId} onChange={(event) => setTableId(event.target.value)}><option value="">Selecione</option>{resources.tables.map((table) => <option key={table.id} value={table.id}>{table.type === "room" ? "Sala" : "Mesa"} {table.number} · {table.capacity} lugares</option>)}</select></label>}
      </fieldset>
      <CustomerFields idPrefix="order-customer" value={customer} onChange={setCustomer} />
      <fieldset className="admin-create-fields"><legend>Pagamento</legend><label>Método<select value={paymentMethod} onChange={(event) => { setPaymentMethod(event.target.value as PaymentMethod); setChangeFor(""); }}>{Object.entries(paymentMethodLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{paymentMethod === "CASH" && <label>Troco para quanto? (opcional)<input inputMode="decimal" placeholder="0,00" value={changeFor} onChange={(event) => setChangeFor(event.target.value)} /></label>}</fieldset>
      {type === "DELIVERY" && <fieldset className="admin-create-fields"><legend>Endereço de entrega</legend>{Object.entries({ street: "Rua", number: "Número", complement: "Complemento (opcional)", neighborhood: "Bairro", city: "Cidade", state: "Estado", zipCode: "CEP" }).map(([key, label]) => <label key={key}>{label}<input required={key !== "complement"} value={address[key as keyof typeof address]} onChange={(event) => setAddress((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</fieldset>}
      <fieldset className="admin-create-fields admin-create-items"><legend>Itens</legend><label>Produto<select value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Selecione</option>{resources.products.map((product) => <option key={product.id} value={product.id}>{product.name} · {formatCatalogMoney(product.price)}</option>)}</select></label><label>Quantidade<input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label>
        {addonsLoading && <p role="status">Carregando adicionais…</p>}{productId && !addonsLoading && addons.map((addon) => <label key={addon.id}>{addon.name} (+ {formatCatalogMoney(addon.price)})<input aria-label={`Quantidade de ${addon.name}`} type="number" min="0" step="1" value={addonQuantities[addon.id] ?? "0"} onChange={(event) => setAddonQuantities((current) => ({ ...current, [addon.id]: event.target.value }))} /></label>)}
        <button className="secondary" type="button" disabled={!productId || addonsLoading} onClick={addItem}>Adicionar item</button>
        {lines.length === 0 ? <p>Nenhum item adicionado.</p> : <ul>{lines.map((line) => <li key={line.product.id}><span>{line.quantity}× {line.product.name}{line.addons.map((entry) => <small key={entry.addon.id}>{entry.quantity}× {entry.addon.name}</small>)}</span><button type="button" className="secondary" onClick={() => setLines((current) => current.filter((item) => item.product.id !== line.product.id))}>Remover</button></li>)}</ul>}
      </fieldset>
      <label className="admin-create-wide">Observação<textarea value={observation} onChange={(event) => setObservation(event.target.value)} /></label>
      <dl className="admin-create-totals"><div><dt>Subtotal estimado</dt><dd>{formatCatalogMoney(estimate)}</dd></div><div><dt>Taxa estimada</dt><dd>{formatCatalogMoney(fee)}</dd></div><div><dt>Total estimado</dt><dd>{formatCatalogMoney(estimate + fee)}</dd></div></dl><p className="muted">Estimativa baseada no catálogo atual. O backend define snapshots e valores finais.</p>
      {error && <p className="error" role="alert">{error}</p>}<button className="primary" type="submit">Revisar pedido</button>
    </form> : <div className="admin-create-review"><p><strong>{draft.type === "PICKUP" ? "Retirada" : draft.type === "DELIVERY" ? "Entrega" : "Mesa"}</strong> para {draft.customer.name}</p><ul>{lines.map((line) => <li key={line.product.id}>{line.quantity}× {line.product.name}{line.addons.map((entry) => <small key={entry.addon.id}>{entry.quantity}× {entry.addon.name}</small>)}</li>)}</ul>{draft.type === "DINE_IN" && <p>Mesa {resources.tables.find((table) => table.id === draft.tableId)?.number}</p>}{draft.type === "DELIVERY" && <p>{draft.deliveryAddress.street}, {draft.deliveryAddress.number} · {draft.deliveryAddress.neighborhood}</p>}<p>Pagamento: <strong>{paymentMethodLabels[draft.paymentMethod]}</strong>{draft.changeForCents !== undefined && <> · Troco para {formatCatalogMoney(draft.changeForCents)}</>}</p><p>Total estimado: <strong>{formatCatalogMoney(estimate + fee)}</strong></p><p className="muted">O valor final será calculado pelo servidor. O pedido será criado com pagamento pendente.</p>
      {error && <p className="error" role="alert">{error}</p>}{isUncertain ? <div className="admin-create-uncertain"><p>Não foi possível confirmar o resultado. Atualize a listagem antes de tentar novamente para evitar duplicidade.</p><button className="secondary" onClick={onUncertain}>Voltar e atualizar listagem</button></div> : <div className="admin-create-actions"><button className="secondary" disabled={busy} onClick={() => setDraft(undefined)}>Voltar e editar</button><button className="primary" disabled={busy} onClick={() => void submit()}>{busy ? "Criando pedido…" : "Confirmar pedido"}</button></div>}
    </div>}
  </section>;
}
