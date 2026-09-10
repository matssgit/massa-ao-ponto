import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { formatCatalogMoney } from "../catalog/catalog-money";
import { ApiError } from "../../lib/api-client";
import { cartLines, changeAddon, changeProduct, estimatedTotal, type PublicCart } from "./public-order-cart";
import { publicDeliveryAddressFormSchema, publicOrderCustomerFormSchema } from "./schemas";
import { PublicReservationService } from "./service";
import { ErrorNotice, PublicFrame, PublicMissing, usePublicQuery } from "./shared";

type CustomerForm = { name: string; phone: string; email: string; observation: string };
const emptyForm: CustomerForm = { name: "", phone: "", email: "", observation: "" };
type AddressForm = { street: string; number: string; complement: string; neighborhood: string; city: string; state: string; zipCode: string };
const emptyAddress: AddressForm = { street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zipCode: "" };

export function PublicOrderPage({ service, slug }: { service: PublicReservationService; slug: string }) {
  const navigate = useNavigate();
  const query = usePublicQuery(useCallback((signal: AbortSignal) =>
    Promise.all([service.restaurant(slug, signal), service.catalog(slug, signal)]), [service, slug]));
  const [cart, setCart] = useState<PublicCart>({});
  const [step, setStep] = useState<"menu" | "customer" | "review">("menu");
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [mode, setMode] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const [address, setAddress] = useState<AddressForm>(emptyAddress);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<Error>();
  const [uncertain, setUncertain] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const alive = useRef(true);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (step !== "menu") stepHeading.current?.focus(); }, [step]);

  const catalog = query.data?.[1];
  const restaurant = query.data?.[0];
  const lines = useMemo(() => catalog ? cartLines(catalog, cart) : [], [catalog, cart]);
  const estimate = useMemo(() => catalog ? estimatedTotal(catalog, cart) : 0, [catalog, cart]);
  const deliveryFee = mode === "DELIVERY" ? restaurant?.deliveryFeeCents ?? 0 : 0;
  const estimatedGrandTotal = estimate + deliveryFee;

  function productQuantity(productId: string, delta: number) {
    setCart((current) => {
      if (delta > 0 && !current[productId] && Object.keys(current).length >= 20) return current;
      return changeProduct(current, productId, delta);
    });
  }

  function addonQuantity(productId: string, addonId: string, delta: number) {
    setCart((current) => {
      const selected = current[productId];
      if (delta > 0 && selected && !selected.addons[addonId] && Object.keys(selected.addons).length >= 10) return current;
      return changeAddon(current, productId, addonId, delta);
    });
  }

  function validateCustomer(event: FormEvent) {
    event.preventDefault();
    const parsed = publicOrderCustomerFormSchema.safeParse(form);
    const parsedAddress = mode === "DELIVERY" ? publicDeliveryAddressFormSchema.safeParse(address) : null;
    if (!parsed.success || (parsedAddress && !parsedAddress.success)) {
      const next: Record<string, string> = {};
      if (!parsed.success) for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      if (parsedAddress && !parsedAddress.success) for (const issue of parsedAddress.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setStep("review");
  }

  async function submit() {
    if (!restaurant || !catalog || submitting.current || lines.length === 0) return;
    submitting.current = true; setBusy(true); setSubmitError(undefined); setUncertain(false);
    try {
      const common = {
        customer: { name: form.name.trim(), phone: form.phone, ...(form.email ? { email: form.email } : {}) },
        items: lines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          ...(line.addons.length ? { addons: line.addons.map(({ addon, quantity }) => ({ addonId: addon.id, quantity })) } : {}),
        })),
        ...(form.observation ? { observation: form.observation } : {}),
      };
      const result = await service.createOrder(slug, mode === "DELIVERY" ? {
        ...common,
        type: "DELIVERY",
        deliveryAddress: {
          street: address.street.trim(), number: address.number.trim(),
          ...(address.complement.trim() ? { complement: address.complement.trim() } : {}),
          neighborhood: address.neighborhood.trim(), city: address.city.trim(),
          state: address.state.trim(), zipCode: address.zipCode.trim(),
        },
      } : { ...common, type: "PICKUP" });
      navigate(`/pedido/${result.accessToken}`);
    } catch (cause) {
      if (alive.current) {
        setSubmitError(cause instanceof Error ? cause : new Error("Não foi possível confirmar o pedido."));
        setUncertain(cause instanceof ApiError && (cause.status === 0 || cause.status >= 500 || cause.code === "INVALID_RESPONSE"));
      }
    } finally {
      submitting.current = false;
      if (alive.current) setBusy(false);
    }
  }

  const missing = query.error instanceof ApiError && query.error.status === 404;
  return <PublicFrame slug={slug} page="order"><Link className="public-back" to={`/r/${encodeURIComponent(slug)}`}>← Voltar ao restaurante</Link>
    {query.loading ? <p role="status">Preparando seu pedido…</p> : missing ? <PublicMissing /> : query.error ? <ErrorNotice error={query.error} retry={query.reload} /> : restaurant && catalog && <>
      {step === "menu" && <section aria-labelledby="order-menu-title"><header className="public-page-title"><p className="public-eyebrow">Pedido online</p><h1 id="order-menu-title">Monte seu pedido</h1><p className="public-intro">Escolha os itens e como deseja receber seu pedido de {restaurant.name}.</p></header>
        <fieldset className="public-card public-order-mode"><legend>Como você quer receber?</legend>
          <label><input type="radio" name="order-mode" checked={mode === "PICKUP"} onChange={() => setMode("PICKUP")} />Retirada no local <small>Sem taxa de entrega</small></label>
          {restaurant.deliveryEnabled && <label><input type="radio" name="order-mode" checked={mode === "DELIVERY"} onChange={() => setMode("DELIVERY")} />Entrega <small>Taxa fixa: {formatCatalogMoney(restaurant.deliveryFeeCents)}</small></label>}
        </fieldset>
        <div className="public-order-layout"><div className="public-order-products">{catalog.categories.map((category) => <section key={category.id} aria-labelledby={`order-category-${category.id}`}><h2 id={`order-category-${category.id}`}>{category.name}</h2>{category.products.map((product) => {
          const selected = cart[product.id]; return <article className="public-menu-product" key={product.id}><div className="public-menu-product-heading"><h3>{product.name}</h3><strong>{formatCatalogMoney(product.price)}</strong></div>{product.description && <p>{product.description}</p>}<div className="public-quantity">{selected ? <><button type="button" aria-label={`Diminuir ${product.name}`} onClick={() => productQuantity(product.id, -1)}>−</button><output aria-label={`Quantidade de ${product.name}`}>{selected.quantity}</output><button type="button" aria-label={`Aumentar ${product.name}`} disabled={selected.quantity >= 20} onClick={() => productQuantity(product.id, 1)}>+</button><button type="button" className="public-remove" onClick={() => setCart(current => changeProduct(current, product.id, -selected.quantity))}>Remover</button></> : <button type="button" className="public-secondary" onClick={() => productQuantity(product.id, 1)}>Adicionar {product.name}</button>}</div>
          {selected && product.addons.length > 0 && <fieldset className="public-order-addons"><legend>Adicionais para {product.name}</legend>{product.addons.map((addon) => { const quantity = selected.addons[addon.id] ?? 0; return <div key={addon.id}><span>{addon.name} · + {formatCatalogMoney(addon.price)}</span><div className="public-quantity">{quantity > 0 && <button type="button" aria-label={`Diminuir ${addon.name}`} onClick={() => addonQuantity(product.id, addon.id, -1)}>−</button>}<output aria-label={`Quantidade de ${addon.name}`}>{quantity}</output><button type="button" aria-label={`Aumentar ${addon.name}`} disabled={quantity >= 20} onClick={() => addonQuantity(product.id, addon.id, 1)}>+</button></div></div>; })}</fieldset>}</article>;
        })}</section>)}</div><aside className="public-card public-order-cart"><h2>Seu carrinho</h2>{lines.length === 0 ? <p>Seu carrinho está vazio.</p> : <ul>{lines.map((line) => <li key={line.product.id}><span>{line.quantity}× {line.product.name}</span><strong>{formatCatalogMoney(line.product.price * line.quantity + line.addons.reduce((sum, entry) => sum + entry.addon.price * entry.quantity, 0))}</strong></li>)}</ul>}<dl className="public-order-estimate"><div><dt>Subtotal</dt><dd>{formatCatalogMoney(estimate)}</dd></div><div><dt>Taxa de entrega</dt><dd>{formatCatalogMoney(deliveryFee)}</dd></div><div><dt>Total estimado</dt><dd><strong>{formatCatalogMoney(estimatedGrandTotal)}</strong></dd></div></dl><small>Estimativa para conferência. O valor final é calculado pelo restaurante no servidor.</small><button className="public-primary" disabled={lines.length === 0} onClick={() => setStep("customer")}>Continuar</button></aside></div>
      </section>}
      {step === "customer" && <section className="public-detail"><h1 ref={stepHeading} tabIndex={-1}>Seus dados</h1><p>Usaremos estas informações apenas para identificar o pedido.</p><form className="public-card" onSubmit={validateCustomer} noValidate>
        <div className="public-fields">
          {([["name", "Nome"], ["phone", "Telefone com DDD"], ["email", "E-mail (opcional)"]] as const).map(([key, label]) => <div key={key}>
            <label htmlFor={`order-${key}`}>{label}<input id={`order-${key}`} type={key === "email" ? "email" : key === "phone" ? "tel" : "text"} value={form[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `order-error-${key}` : undefined} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} /></label>
            {errors[key] && <span id={`order-error-${key}`} className="public-field-error">{errors[key]}</span>}
          </div>)}
        </div>
        <label htmlFor="order-observation">Observação (opcional)<textarea id="order-observation" value={form.observation} aria-invalid={!!errors.observation} aria-describedby={errors.observation ? "order-error-observation" : undefined} onChange={event => setForm(current => ({ ...current, observation: event.target.value }))} /></label>
        {errors.observation && <span id="order-error-observation" className="public-field-error">{errors.observation}</span>}
        {mode === "DELIVERY" && <fieldset className="public-delivery-address"><legend>Endereço de entrega</legend><div className="public-fields">
          {([["street", "Rua"], ["number", "Número"], ["complement", "Complemento (opcional)"], ["neighborhood", "Bairro"], ["city", "Cidade"], ["state", "UF"], ["zipCode", "CEP"]] as const).map(([key, label]) => <div key={key}><label htmlFor={`delivery-${key}`}>{label}<input id={`delivery-${key}`} value={address[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `delivery-error-${key}` : undefined} onChange={event => setAddress(current => ({ ...current, [key]: event.target.value }))} /></label>{errors[key] && <span id={`delivery-error-${key}`} className="public-field-error">{errors[key]}</span>}</div>)}
        </div></fieldset>}
        <div className="public-confirm-actions"><button type="button" className="public-secondary" onClick={() => setStep("menu")}>Voltar ao cardápio</button><button className="public-primary" type="submit">Revisar pedido</button></div>
      </form></section>}
      {step === "review" && <section className="public-detail"><h1 ref={stepHeading} tabIndex={-1}>Revise seu pedido</h1><p className="public-status">{mode === "DELIVERY" ? "Entrega" : "Retirada no local"}</p><section className="public-card"><h2>Itens</h2><ul className="public-order-review-items">{lines.map((line) => <li key={line.product.id}><strong>{line.quantity}× {line.product.name}</strong>{line.addons.length > 0 && <ul>{line.addons.map(({ addon, quantity }) => <li key={addon.id}>{quantity}× {addon.name}</li>)}</ul>}</li>)}</ul><dl className="public-order-estimate"><div><dt>Subtotal</dt><dd>{formatCatalogMoney(estimate)}</dd></div><div><dt>Taxa de entrega</dt><dd>{formatCatalogMoney(deliveryFee)}</dd></div><div><dt>Total estimado</dt><dd><strong>{formatCatalogMoney(estimatedGrandTotal)}</strong></dd></div></dl><small>O total confirmado na próxima tela é calculado pelo servidor.</small></section><section className="public-card"><h2>{mode === "DELIVERY" ? "Entrega e contato" : "Retirada e contato"}</h2>{mode === "DELIVERY" ? <p>{address.street}, {address.number}{address.complement && <> · {address.complement}</>}<br />{address.neighborhood} · {address.city}/{address.state}<br />CEP {address.zipCode}</p> : <p>{restaurant.name}<br />{restaurant.address}</p>}<p>{form.name}<br />{form.phone}{form.email && <><br />{form.email}</>}</p>{form.observation && <p className="public-notes">{form.observation}</p>}</section>{uncertain && <div className="public-error" role="alert" tabIndex={-1}><p>Não foi possível confirmar a resposta. O pedido pode ter sido criado. Para evitar duplicidade, não envie novamente agora; confira sua conexão e entre em contato com o restaurante.</p></div>}{submitError && !uncertain && <ErrorNotice error={submitError} />}<div className="public-confirm-actions"><button className="public-secondary" disabled={busy} onClick={() => setStep("customer")}>Editar dados</button><button className="public-primary" disabled={busy || uncertain} onClick={() => void submit()}>{busy ? "Enviando pedido…" : "Confirmar pedido"}</button></div></section>}
    </>}
  </PublicFrame>;
}
