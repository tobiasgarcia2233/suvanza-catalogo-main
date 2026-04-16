import "server-only";
import { createClient, type Client } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var __tursoClient: Client | undefined;
}

export const db: Client =
  globalThis.__tursoClient ?? createClient({ url, authToken });

if (process.env.NODE_ENV !== "production") {
  globalThis.__tursoClient = db;
}
