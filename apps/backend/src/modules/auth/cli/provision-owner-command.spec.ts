import { describe, expect, it, vi } from "vitest";
import { OwnerEmailAlreadyExistsError, OwnerMembershipAlreadyExistsError } from "../errors/owner-provisioning-errors.js";
import { runProvisionOwnerCommand } from "./provision-owner-command.js";

describe("administrative owner provisioning command", () => {
  const environment = {
    PROVISION_OWNER_EMAIL: "  ADMIN@EXAMPLE.COM  ", PROVISION_OWNER_PASSWORD: "test-only-secret",
    PROVISION_RESTAURANT_NAME: "Test", PROVISION_RESTAURANT_ADDRESS: "Address",
    PROVISION_RESTAURANT_PHONE: "11999999999", PROVISION_RESTAURANT_TIMEZONE: "America/Sao_Paulo",
  };

  it("passes validated input to the service and prints only identifiers", async () => {
    const provision = vi.fn().mockResolvedValue({ userId: "user", restaurantId: "restaurant", membershipId: "membership", passwordHash: "must-not-print" });
    const result = await runProvisionOwnerCommand(environment, provision);
    expect(result).toEqual({ exitCode: 0, message: JSON.stringify({ userId: "user", restaurantId: "restaurant", membershipId: "membership" }) });
    expect(provision).toHaveBeenCalledWith({
      email: "admin@example.com", password: environment.PROVISION_OWNER_PASSWORD,
      restaurant: { name: "Test", address: "Address", phone: "11999999999", timezone: "America/Sao_Paulo" },
    });
  });

  it.each(Object.keys(environment))("rejects missing %s before loading persistence", async (missing) => {
    const provision = vi.fn();
    const result = await runProvisionOwnerCommand({ ...environment, [missing]: undefined }, provision);
    expect(result.exitCode).toBe(1);
    expect(provision).not.toHaveBeenCalled();
    expect(result.message).not.toContain(environment.PROVISION_OWNER_PASSWORD);
    expect(result.message).not.toContain(environment.PROVISION_OWNER_EMAIL);
  });

  it.each([new OwnerEmailAlreadyExistsError(), new OwnerMembershipAlreadyExistsError()])("reports known administrative conflicts safely (%#)", async (error) => {
    const result = await runProvisionOwnerCommand(environment, vi.fn().mockRejectedValue(error));
    expect(result).toEqual({ exitCode: 1, message: error.message });
  });

  it("does not print sensitive database/crypto error details", async () => {
    const error = new Error("SQL failed with password=test-only-secret passwordHash=private-hash token=private-token");
    const result = await runProvisionOwnerCommand(environment, vi.fn().mockRejectedValue(error));
    expect(result.exitCode).toBe(1);
    expect(result.message).toContain("Detalhes sensíveis foram omitidos");
    for (const secret of [environment.PROVISION_OWNER_PASSWORD, "private-hash", "private-token"]) {
      expect(result.message).not.toContain(secret);
    }
  });
});
