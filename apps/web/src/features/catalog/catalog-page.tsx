import { useMemo, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../auth/auth-state";
import { isOwner, useRestaurant } from "../auth/restaurant-state";
import { AddonsSection, CategoriesSection, ProductsSection } from "./catalog-sections";
import { CatalogService } from "./catalog-service";
import "./catalog.css";

type CatalogTab = "products" | "categories" | "addons";
const tabs: { id: CatalogTab; label: string }[] = [
  { id: "products", label: "Produtos" }, { id: "categories", label: "Categorias" }, { id: "addons", label: "Adicionais" },
];

function OwnerCatalog({ restaurantId }: { restaurantId: string }) {
  const { service: auth } = useAuth();
  const service = useMemo(() => new CatalogService(auth.client), [auth.client]);
  const [tab, setTab] = useState<CatalogTab>("products");
  return <section className="catalog-page"><header className="catalog-heading"><p className="eyebrow">ADMINISTRAÇÃO DO MENU</p><h1>Cardápio</h1></header>
    <nav className="catalog-tabs" aria-label="Áreas do cardápio">{tabs.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} aria-current={tab === item.id ? "page" : undefined} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
    {tab === "products" && <ProductsSection service={service} restaurantId={restaurantId} />}
    {tab === "categories" && <CategoriesSection service={service} restaurantId={restaurantId} />}
    {tab === "addons" && <AddonsSection service={service} restaurantId={restaurantId} />}
  </section>;
}

export function CatalogPage() {
  const { restaurantId, membership } = useRestaurant();
  if (!restaurantId || !membership) return null;
  if (!isOwner(membership)) return <Navigate to="/" replace />;
  return <OwnerCatalog key={restaurantId} restaurantId={restaurantId} />;
}
