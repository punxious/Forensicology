import "server-only";
import path from "node:path";
import { drizzle as drizzlePg, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

export type Db = PostgresJsDatabase<typeof schema>;

/**
 * Database connection.
 *
 * - `DATABASE_URL` set: Postgres (Supabase in production). Use the pooled
 *   "transaction" connection string; prepared statements are disabled for it.
 * - Not set, outside production (or `FX_LOCAL_DB=1` for local production
 *   builds): an embedded PGlite database (real Postgres compiled to WASM) in
 *   `.data/pglite`, migrated automatically. No setup needed.
 */
const g = globalThis as unknown as { __fxDb?: Promise<Db> };

export function localDbAllowed(): boolean {
  if (process.env.VERCEL) return false;
  return process.env.NODE_ENV !== "production" || process.env.FX_LOCAL_DB === "1";
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const client = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
    return drizzlePg(client, { schema });
  }
  if (!localDbAllowed()) throw new Error("DATABASE_URL must be set in production.");
  const [{ PGlite }, { drizzle }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const dir = process.env.FX_PGLITE_DIR ?? path.join(process.cwd(), ".data/pglite");
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "db/migrations") });
  return db as unknown as Db;
}

export function getDb(): Promise<Db> {
  g.__fxDb ??= connect().catch((e) => {
    g.__fxDb = undefined;
    throw e;
  });
  return g.__fxDb;
}
