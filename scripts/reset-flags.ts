// ── Reset reconciliation flags ─────────────────────────────
// Truncates reconciliation_flags so the engine re-classifies on next page load.
// Use after deploying the orphan_night/gap + estimatedValue reclassification.
import { config } from "dotenv";                      // env file loader
import { createDb } from "../db/index";               // lazy DB factory — reads DATABASE_URL at call time
import * as schema from "../db/schema";               // table definitions for the delete target

config({ path: ".env.local" });                       // load DATABASE_URL before createDb() runs
const db = createDb();                                // open postgres connection now that env is set

async function main() {
  await db.delete(schema.reconciliationFlags);        // clear all flag rows
  console.log("Cleared reconciliation_flags — reload /reconciliation to re-classify."); // confirm to operator
  process.exit(0);                                    // explicit exit — postgres keeps the event loop alive otherwise
}

main().catch((err) => {                               // surface any failure with a non-zero exit code
  console.error(err);
  process.exit(1);
});
