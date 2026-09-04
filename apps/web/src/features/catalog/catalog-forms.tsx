import { useState, type FormEvent } from "react";
import { z } from "zod";
import { centsToInput, inputToCents } from "./catalog-money";
import {
  addonInputSchema, categoryInputSchema, productInputSchema,
  type Addon, type AddonInput, type Category, type CategoryInput, type Product, type ProductInput,
} from "./catalog-service";

function issue(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Revise os campos informados.";
  return error instanceof Error ? error.message : "Revise os campos informados.";
}

export function CategoryForm({ item, busy, onCancel, onSubmit }: {
  item?: Category; busy: boolean; onCancel?: () => void; onSubmit: (value: CategoryInput) => Promise<boolean>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(item?.displayOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const value = categoryInputSchema.parse({ name, description: description.trim() || null, displayOrder: Number(displayOrder), active: item?.active });
      setError(null); const saved = await onSubmit(value);
      if (saved && !item) { setName(""); setDescription(""); setDisplayOrder("0"); }
    } catch (cause) { setError(issue(cause)); }
  }
  return <form className="catalog-form" onSubmit={(event) => void submit(event)} aria-label={item ? "Editar categoria" : "Nova categoria"}>
    <h3>{item ? "Editar categoria" : "Nova categoria"}</h3>
    <label>Nome<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <label>Ordem de exibição<input required type="number" min="0" step="1" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="catalog-form-actions"><button className="primary" disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar categoria"}</button>{onCancel && <button className="secondary" disabled={busy} type="button" onClick={onCancel}>Cancelar edição</button>}</div>
  </form>;
}

export function ProductForm({ item, categories, busy, onCancel, onSubmit }: {
  item?: Product; categories: Category[]; busy: boolean; onCancel?: () => void; onSubmit: (value: ProductInput) => Promise<boolean>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? centsToInput(item.price) : "0,00");
  const [categoryId, setCategoryId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [displayOrder, setDisplayOrder] = useState(String(item?.displayOrder ?? 0));
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const value = productInputSchema.parse({ name, description: description.trim() || null, price: inputToCents(price), categoryId, displayOrder: Number(displayOrder), active: item?.active });
      setError(null); const saved = await onSubmit(value);
      if (saved && !item) { setName(""); setDescription(""); setPrice("0,00"); setDisplayOrder("0"); }
    } catch (cause) { setError(issue(cause)); }
  }
  return <form className="catalog-form" onSubmit={(event) => void submit(event)} aria-label={item ? "Editar produto" : "Novo produto"}>
    <h3>{item ? "Editar produto" : "Novo produto"}</h3>
    <label>Nome<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <label>Preço (R$)<input required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
    <label>Categoria<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
    <label>Ordem de exibição<input required type="number" min="0" step="1" value={displayOrder} onChange={(event) => setDisplayOrder(event.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="catalog-form-actions"><button className="primary" disabled={busy || categories.length === 0} type="submit">{busy ? "Salvando…" : "Salvar produto"}</button>{onCancel && <button className="secondary" disabled={busy} type="button" onClick={onCancel}>Cancelar edição</button>}</div>
    {categories.length === 0 && <p className="catalog-help">Crie uma categoria antes de cadastrar produtos.</p>}
  </form>;
}

export function AddonForm({ item, busy, onCancel, onSubmit }: {
  item?: Addon; busy: boolean; onCancel?: () => void; onSubmit: (value: AddonInput) => Promise<boolean>;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? centsToInput(item.price) : "0,00");
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const value = addonInputSchema.parse({ name, description: description.trim() || null, price: inputToCents(price), active: item?.active });
      setError(null); const saved = await onSubmit(value);
      if (saved && !item) { setName(""); setDescription(""); setPrice("0,00"); }
    } catch (cause) { setError(issue(cause)); }
  }
  return <form className="catalog-form" onSubmit={(event) => void submit(event)} aria-label={item ? "Editar adicional" : "Novo adicional"}>
    <h3>{item ? "Editar adicional" : "Novo adicional"}</h3>
    <label>Nome<input required value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Descrição<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <label>Preço (R$)<input required inputMode="decimal" value={price} onChange={(event) => setPrice(event.target.value)} /></label>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="catalog-form-actions"><button className="primary" disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar adicional"}</button>{onCancel && <button className="secondary" disabled={busy} type="button" onClick={onCancel}>Cancelar edição</button>}</div>
  </form>;
}
