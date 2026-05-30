// ── Imports ───────────────────────────────────────────────
import { defineConfig } from "drizzle-kit";   // Drizzle Kit configuration helper
import { config } from "dotenv";              // load DATABASE_URL from .env.local before drizzle-kit reads it

config({ path: ".env.local" });               // populate process.env before defineConfig runs

// ── Drizzle Kit configuration ─────────────────────────────
export default defineConfig({
  schema:  "./db/schema.ts",     // location of the Drizzle schema file
  out:     "./db/migrations",    // directory where drizzle-kit writes SQL migration files
  dialect: "postgresql",         // target database dialect
  dbCredentials: {
    url: process.env.DATABASE_URL!,  // Supabase connection string (pooler URL recommended)
  },
});
