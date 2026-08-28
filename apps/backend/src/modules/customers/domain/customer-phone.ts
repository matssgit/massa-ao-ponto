export const MIN_CUSTOMER_PHONE_LENGTH = 10;

export function normalizeCustomerPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}
