import type { PublicCatalog } from "./schemas";

export type PublicCart = Record<string, {
  quantity: number;
  addons: Record<string, number>;
}>;

export function cartLines(catalog: PublicCatalog, cart: PublicCart) {
  return catalog.categories.flatMap((category) => category.products).flatMap((product) => {
    const selected = cart[product.id];
    if (!selected) return [];
    return [{
      product,
      quantity: selected.quantity,
      addons: product.addons.flatMap((addon) => {
        const quantity = selected.addons[addon.id] ?? 0;
        return quantity > 0 ? [{ addon, quantity }] : [];
      }),
    }];
  });
}

export function estimatedTotal(catalog: PublicCatalog, cart: PublicCart): number {
  return cartLines(catalog, cart).reduce((total, line) =>
    total + line.product.price * line.quantity +
    line.addons.reduce((addons, entry) => addons + entry.addon.price * entry.quantity, 0), 0);
}

export function changeProduct(cart: PublicCart, productId: string, delta: number): PublicCart {
  const current = cart[productId]?.quantity ?? 0;
  const quantity = Math.max(0, Math.min(20, current + delta));
  if (quantity === 0) {
    const { [productId]: removed, ...rest } = cart;
    void removed;
    return rest;
  }
  return { ...cart, [productId]: { quantity, addons: cart[productId]?.addons ?? {} } };
}

export function changeAddon(cart: PublicCart, productId: string, addonId: string, delta: number): PublicCart {
  const item = cart[productId];
  if (!item) return cart;
  const quantity = Math.max(0, Math.min(20, (item.addons[addonId] ?? 0) + delta));
  const addons = { ...item.addons };
  if (quantity === 0) delete addons[addonId];
  else addons[addonId] = quantity;
  return { ...cart, [productId]: { ...item, addons } };
}
