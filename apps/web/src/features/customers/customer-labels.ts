export function formatCustomerPhone(value: string): string {
  if (/^\d{11}$/.test(value)) return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
  if (/^\d{10}$/.test(value)) return `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
  return value;
}

export function customerEmail(value: string | null): string {
  return value ?? "Não informado";
}
