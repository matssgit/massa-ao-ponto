import { runProvisionOwnerCommand } from "./provision-owner-command.js";

if (process.argv.length > 2) {
  console.error("Este comando aceita somente variáveis de ambiente de execução; não passe credenciais por argumentos.");
  process.exitCode = 1;
} else {
  // Validate execution inputs before dotenv loads the database configuration.
  const result = await runProvisionOwnerCommand(process.env, async (input) => {
    const { db } = await import("../../../db/index.js");
    try {
      const { DrizzleOwnerProvisioningTransactionManager } = await import("../transactions/drizzle-owner-provisioning-transaction-manager.js");
      const { Argon2PasswordHasher } = await import("../password-hasher.js");
      const { ProvisionOwnerUseCase } = await import("../use-cases/provision-owner.use-case.js");
      return await new ProvisionOwnerUseCase(
        new DrizzleOwnerProvisioningTransactionManager(), new Argon2PasswordHasher(),
      ).execute(input);
    } finally {
      await db.$client.end({ timeout: 5 });
    }
  });
  if (result.exitCode === 0) console.log(result.message);
  else console.error(result.message);
  process.exitCode = result.exitCode;
}
