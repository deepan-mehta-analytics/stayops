// ── Imports ───────────────────────────────────────────────
import { drizzle } from "drizzle-orm/postgres-js";    // Drizzle ORM adapter for postgres.js
import postgres from "postgres";                       // postgres.js low-level client
import * as schema from "./schema";                    // all table definitions for typed queries

// ── Factory ───────────────────────────────────────────────
// Returns a new Drizzle DB instance.  Intentionally a factory (not a module-level
// singleton) so that standalone scripts (seed, migrations) can call createDb()
// AFTER loading .env.local via dotenv — module-level init would read DATABASE_URL
// before dotenv runs, producing a "not set" error.
export function createDb() {
  const url = process.env.DATABASE_URL;                                // read from environment at call time
  if (!url) {                                                          // fail fast with a clear message
    throw new Error(
      "DATABASE_URL is not set.\n" +
      "Copy .env.local.example to .env.local and add your Supabase connection string."
    );
  }
  const client = postgres(url, { ssl: "require" });                   // Supabase requires SSL on all connections
  return drizzle(client, { schema });                                  // wrap client with Drizzle and typed schema
}

// ── Type export ───────────────────────────────────────────
// Use this type in API routes and server actions to avoid re-importing createDb.
export type Db = ReturnType<typeof createDb>;
