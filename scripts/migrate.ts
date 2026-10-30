/**
 * Applies db/migrations to DATABASE_URL (e.g. your Supabase project).
 * Use the direct (non-pooled) connection string for migrations.
 *
 *   DATABASE_URL=postgres://... pnpm db:migrate
 *
 * The local PGlite database migrates itself; you don't need this for `pnpm dev`.
 */
import path from "node:path";
import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const root = path.resolve(import.meta.dirname, "..");
nextEnv.loadEnvConfig(root);
const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error("✖ Set DATABASE_URL (or DATABASE_MIGRATION_URL) first.");
  process.exit(1);
}
const client = postgres(url, { max: 1 });
await migrate(drizzle(client), { migrationsFolder: path.join(root, "db/migrations") });
await client.end();
console.log("✔ Migrations applied.");
