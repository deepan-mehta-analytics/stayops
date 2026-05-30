// ── Reconciliation flags page ──────────────────────────────
export const dynamic = "force-dynamic";               // always query live DB — flags change after imports
import { createDb } from "@/db/index";                // DB factory
import * as schema from "@/db/schema";                // table definitions
import { desc } from "drizzle-orm";                   // query helpers
import { runReconciliation } from "@/lib/reconciliation"; // auto-trigger engine

// ── Badge colour map per flag type ─────────────────────────
const TYPE_STYLES: Record<string, string> = {
  duplicate:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  double_book:    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  gap:            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  price_mismatch: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const TYPE_LABELS: Record<string, string> = {
  duplicate:      "Duplicate",
  double_book:    "Double-booked",
  gap:            "Gap",
  price_mismatch: "Price mismatch",
};

// ── Server component ──────────────────────────────────────
export default async function ReconciliationPage() {
  const db = createDb();                               // server-side DB connection

  // Auto-trigger reconciliation if the flags table is empty
  const existingCount = await db.$count(schema.reconciliationFlags);
  if (existingCount === 0) {
    await runReconciliation(db);                       // populate flags on first load
  }

  // Fetch all flags, newest first
  const flags = await db
    .select()
    .from(schema.reconciliationFlags)
    .orderBy(desc(schema.reconciliationFlags.createdAt));

  // Summary counts by type
  const byType = {
    duplicate:      flags.filter((f) => f.type === "duplicate").length,
    double_book:    flags.filter((f) => f.type === "double_book").length,
    gap:            flags.filter((f) => f.type === "gap").length,
    price_mismatch: flags.filter((f) => f.type === "price_mismatch").length,
  };
  const open     = flags.filter((f) => f.status === "open").length;
  const resolved = flags.filter((f) => f.status === "resolved").length;

  return (
    <div className="flex flex-col gap-6">

      {/* page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reconciliation</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {open} open · {resolved} resolved · {flags.length} total flags
        </p>
      </div>

      {/* summary cards — one per flag type */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {(["duplicate", "double_book", "gap", "price_mismatch"] as const).map((type) => (
          <div key={type} className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[type]}`}>
              {TYPE_LABELS[type]}
            </span>
            <p className="mt-2 text-3xl font-bold">{byType[type]}</p>
          </div>
        ))}
      </div>

      {/* flags table */}
      {flags.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-12 text-center">
          <p className="text-zinc-400 text-sm">No reconciliation flags — all bookings look clean.</p>
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
              {flags.map((flag) => (
                <tr key={flag.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[flag.type] ?? ""}`}>
                      {TYPE_LABELS[flag.type] ?? flag.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-lg">
                    {flag.reason}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      flag.status === "open"
                        ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    }`}>
                      {flag.status}
                    </span>
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

    </div>
  );
}
