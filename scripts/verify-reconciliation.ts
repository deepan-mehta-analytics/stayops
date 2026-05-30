// ── Verification script — runs reconciliation against live DB ──
import { config } from "dotenv";
import { createDb } from "../db/index";
import { runReconciliation } from "../lib/reconciliation";

config({ path: ".env.local" });                     // load DATABASE_URL before DB init

async function verify() {
  const db = createDb();                            // open connection now that env is loaded
  const result = await runReconciliation(db);       // run all 4 detection rules
  console.log(JSON.stringify(result, null, 2));     // print result summary
}

verify()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
