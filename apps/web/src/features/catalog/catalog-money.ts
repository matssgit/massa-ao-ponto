export function centsToInput(cents: number): string {
  const whole = Math.floor(cents / 100);
  return `${whole},${String(cents % 100).padStart(2, "0")}`;
}

export function inputToCents(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) throw new Error("Informe um preço válido com até duas casas decimais.");
  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function formatCatalogMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}
