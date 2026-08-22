import { db } from "./src/db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(
      sql`ALTER TYPE "order_type" ADD VALUE IF NOT EXISTS 'DINE_IN'`,
    );
    console.log("✅ Enum order_type atualizado com DINE_IN com sucesso!");
  } catch (err) {
    console.error("Erro ao atualizar:", err);
  }
  process.exit(0);
}

main();
