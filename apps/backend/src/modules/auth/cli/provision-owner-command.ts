import { OwnerProvisioningError } from "../errors/owner-provisioning-errors.js";
import { parseProvisionOwnerInput, type ProvisionOwnerInput } from "../schemas/provision-owner.schema.js";
import type { ProvisionOwnerResult } from "../use-cases/provision-owner.use-case.js";

export async function runProvisionOwnerCommand(
  environment: Record<string, string | undefined>,
  provision: (input: ProvisionOwnerInput) => Promise<ProvisionOwnerResult>,
): Promise<{ exitCode: number; message: string }> {
  try {
    const input = parseProvisionOwnerInput({
      email: environment.PROVISION_OWNER_EMAIL,
      password: environment.PROVISION_OWNER_PASSWORD,
      restaurant: {
        name: environment.PROVISION_RESTAURANT_NAME,
        address: environment.PROVISION_RESTAURANT_ADDRESS,
        phone: environment.PROVISION_RESTAURANT_PHONE,
        timezone: environment.PROVISION_RESTAURANT_TIMEZONE,
      },
    });
    const { userId, restaurantId, membershipId } = await provision(input);
    return { exitCode: 0, message: JSON.stringify({ userId, restaurantId, membershipId }) };
  } catch (error) {
    return {
      exitCode: 1,
      message: error instanceof OwnerProvisioningError
        ? error.message
        : "Falha no provisionamento. Verifique a conexão e as constraints do banco antes de tentar novamente. Detalhes sensíveis foram omitidos.",
    };
  }
}
