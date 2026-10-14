import { createClient } from "@libsql/client";
import { checkOdooProductSchema, migrateOdooProductLink } from "../db/odooProductMigration";

let stage = "configuración";

async function main() {
  if (!process.env.TURSO_DATABASE_URL) throw new Error("Configure TURSO_DATABASE_URL");
  const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  try {
    if (process.argv.includes("--check")) {
      stage = "verificación de esquema (solo lectura)";
      const status = await checkOdooProductSchema(db);
      console.table(status);
      if (!Object.values(status).every(Boolean)) {
        console.error("Migración de variantes pendiente o incompleta en esta base. No se modificaron datos.");
        process.exitCode = 1;
      }
      return;
    }
    stage = "migración";
    const pending = await migrateOdooProductLink(db);
    stage = "verificación posterior";
    const status = await checkOdooProductSchema(db);
    if (!Object.values(status).every(Boolean)) throw new Error("Incomplete migration");
    console.table(status);
    console.log("✓ Vínculos por variante migrados. Referencias pendientes:");
    console.table(pending);
    if (pending.length) console.log("Abrí Editar en cada producto y asigná la referencia conservada a una variante.");
  } finally { db.close(); }
}
main().catch((error: unknown) => {
  // Driver messages can contain connection details; report only a safe code.
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "UNKNOWN";
  console.error(`Falló ${stage}. Código: ${/^[A-Z0-9_]+$/.test(code) ? code : "UNKNOWN"}. No se confirmó la migración.`);
  process.exitCode = 1;
});
