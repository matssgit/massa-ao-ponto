import { describe, expect, it } from "vitest";

import { normalizeCustomerPhone } from "./customer-phone.js";

describe("normalizeCustomerPhone", () => {
  it("mantém somente os dígitos sem aplicar heurística de país", () => {
    expect(normalizeCustomerPhone("11999999999")).toBe("11999999999");
    expect(normalizeCustomerPhone("+55 (11) 99999-9999")).toBe(
      "5511999999999",
    );
    expect(normalizeCustomerPhone("11 99999.9999")).toBe("11999999999");
    expect(normalizeCustomerPhone("tel: 11 ABC 99999-9999")).toBe(
      "11999999999",
    );
  });
});
