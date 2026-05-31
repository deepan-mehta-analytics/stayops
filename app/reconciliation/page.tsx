// ── Reconciliation page — server component ─────────────────
// Fetches all flags server-side and passes serialised data to ReconciliationClient.
export const dynamic = "force-dynamic";                                  // always query live DB — flags change after imports

import { createDb } from "@/db/index";                                   // DB factory
import * as schema from "@/db/schema";                                   // table definitions
import { desc } from "drizzle-orm";                                      // newest-first ordering
import { runReconciliation } from "@/lib/reconciliation";                // auto-trigger engine
import ReconciliationClient, { type FlagRow } from "@/components/reconciliation-client"; // client wrapper

// ── Severity ordering for the Conflicts section ────────────
const CONFLICT_ORDER: Record<string, number> = {
  double_book:    0,   // P0 — guest arrives to no room
  duplicate:      1,   // data integrity issue
  price_mismatch: 2,   // margin leak
};

export default async function ReconciliationPage() {
  const db = createDb();                                                  // server-side DB connection

  const existingCount = await db.$count(schema.reconciliationFlags);     // count existing flags
  if (existingCount === 0) {
    await runReconciliation(db);                                          // auto-populate on first load
  }

  const flags = await db                                                  // fetch all flags newest-first
    .select()
    .from(schema.reconciliationFlags)
    .orderBy(desc(schema.reconciliationFlags.createdAt));

  // ── Serialise: convert Date to ISO string for client boundary ──
  // Next.js App Router cannot pass Date objects through the server→client boundary.
  const serialise = (f: typeof flags[0]): FlagRow => ({
    id:             f.id,                                                 // flag UUID
    type:           f.type,                                               // conflict type
    reason:         f.reason,                                             // rule-based reason
    status:         f.status,                                             // open|resolved|ignored
    bookingIds:     f.bookingIds,                                         // involved bookings
    createdAt:      f.createdAt.toISOString(),                            // Date → ISO string
    estimatedValue: f.estimatedValue,                                     // numeric string | null
  });

  const conflicts = flags
    .filter((f) => f.type === "duplicate" || f.type === "double_book" || f.type === "price_mismatch")
    .sort((a, b) => (CONFLICT_ORDER[a.type] ?? 9) - (CONFLICT_ORDER[b.type] ?? 9)) // severity order
    .map(serialise);                                                      // serialise for client boundary

  const opportunities = flags.filter((f) => f.type === "gap").map(serialise); // gap flags serialised
  const orphanCount   = flags.filter((f) => f.type === "orphan_night").length; // 1-night count

  const openConflicts = conflicts.filter((f) => f.status === "open").length;   // open conflict count
  const recoverable   = opportunities
    .filter((f) => f.status === "open")
    .reduce((sum, f) => sum + Number(f.estimatedValue ?? 0), 0);         // sum opportunity values

  return (
    <div className="flex flex-col gap-4">                                 {/* page container */}
      <h1 className="text-2xl font-semibold tracking-tight">Reconciliation</h1>  {/* page title */}
      {/* all interactivity — selectedFlag state + router.refresh — lives in the client component */}
      <ReconciliationClient
        conflicts={conflicts}
        opportunities={opportunities}
        orphanCount={orphanCount}
        openConflicts={openConflicts}
        recoverable={recoverable}
      />
    </div>
  );
}
