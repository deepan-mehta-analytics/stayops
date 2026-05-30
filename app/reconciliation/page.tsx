// ── Reconciliation page — Conflicts vs Opportunities ───────
export const dynamic = "force-dynamic";               // always query live DB — flags change after imports
import { createDb } from "@/db/index";                // DB factory
import * as schema from "@/db/schema";                // table definitions
import { desc } from "drizzle-orm";                   // newest-first ordering
import { runReconciliation } from "@/lib/reconciliation"; // auto-trigger engine

// ── Badge colour map per flag type ─────────────────────────
const TYPE_STYLES: Record<string, string> = {
  duplicate:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",  // yellow for duplicates
  double_book:    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",              // red for double-bookings
  gap:            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",           // blue for opportunities
  price_mismatch: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",  // purple for price issues
};

// ── Human labels per flag type ─────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  duplicate:      "Duplicate",       // same booking from two channels
  double_book:    "Double-booked",   // two guests on same dates
  gap:            "Opportunity",     // unsold inventory window
  price_mismatch: "Price mismatch",  // nightly rate >25% off base
};

// ── Severity ordering for the Conflicts section ────────────
const CONFLICT_ORDER: Record<string, number> = {
  double_book:    0,  // P0 — guest arrives to no room
  duplicate:      1,  // data integrity issue
  price_mismatch: 2,  // margin leak
};

// ── Server component ──────────────────────────────────────
export default async function ReconciliationPage() {
  const db = createDb();                               // server-side DB connection

  // Auto-trigger reconciliation if the flags table is empty
  const existingCount = await db.$count(schema.reconciliationFlags); // count existing flags
  if (existingCount === 0) {
    await runReconciliation(db);                       // populate flags on first load
  }

  // Fetch all flags ordered newest first
  const flags = await db
    .select()
    .from(schema.reconciliationFlags)
    .orderBy(desc(schema.reconciliationFlags.createdAt)); // newest first

  // ── Partition flags by business category ─────────────
  const conflicts = flags
    .filter((f) => f.type === "duplicate" || f.type === "double_book" || f.type === "price_mismatch")
    .sort((a, b) => (CONFLICT_ORDER[a.type] ?? 9) - (CONFLICT_ORDER[b.type] ?? 9)); // severity order

  const opportunities = flags.filter((f) => f.type === "gap");          // actionable revenue windows
  const orphanCount   = flags.filter((f) => f.type === "orphan_night").length; // 1-night unsellable windows

  const openConflicts = conflicts.filter((f) => f.status === "open").length; // open conflict count
  const recoverable   = opportunities
    .filter((f) => f.status === "open")
    .reduce((sum, f) => sum + Number(f.estimatedValue ?? 0), 0); // parse numeric string before summing

  return (
    <div className="flex flex-col gap-8">

      {/* ── Page header ────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reconciliation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {openConflicts} conflict{openConflicts === 1 ? "" : "s"} need action ·{" "}
          {opportunities.length} revenue opportunit{opportunities.length === 1 ? "y" : "ies"} worth ~${recoverable.toLocaleString()} ·{" "}
          {orphanCount} orphan night{orphanCount === 1 ? "" : "s"}
        </p>
      </div>

      {/* ── Conflicts section ───────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Conflicts <span className="text-zinc-400 font-normal">— need action</span>
        </h2>
        {conflicts.length === 0 ? (
          // Clean state — green panel when no real conflicts exist
          <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-6 text-center">
            <p className="text-green-700 dark:text-green-300 text-sm">No conflicts — all bookings reconcile cleanly.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Reason</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {conflicts.map((flag) => (
                  <tr key={flag.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[flag.type] ?? ""}`}>
                        {TYPE_LABELS[flag.type] ?? flag.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-lg">{flag.reason}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        flag.status === "open"
                          ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"  // muted for open
                          : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" // green for resolved
                      }`}>{flag.status}</span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {new Date(flag.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Opportunities section ───────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Opportunities <span className="text-zinc-400 font-normal">— unsold inventory to capture</span>
        </h2>
        {opportunities.length === 0 ? (
          <p className="text-sm text-zinc-400">No open revenue windows right now.</p>
        ) : (
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Window</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Detail</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Recoverable</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Detected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {opportunities.map((flag) => (
                  <tr key={flag.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES.gap}`}>
                        {TYPE_LABELS.gap}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-lg">{flag.reason}</td>
                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                      ~${Number(flag.estimatedValue ?? 0).toLocaleString()} {/* parse numeric string */}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                      {new Date(flag.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Orphan-night footnote (transparency — not hidden, just de-prioritised) ── */}
      {orphanCount > 0 && (
        <p className="text-xs text-zinc-400">
          +{orphanCount} orphan night{orphanCount === 1 ? "" : "s"} (1-night windows, not actionable under a typical 2-night minimum).
        </p>
      )}

    </div>
  );
}
