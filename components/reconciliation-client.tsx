// ── Client wrapper for the reconciliation page ────────────
"use client";                                                            // manages selectedFlag state + router.refresh()

import { useState } from "react";                                        // state hook
import { useRouter } from "next/navigation";                             // for router.refresh() after resolve
import ConflictSlideOver from "@/components/conflict-slide-over";        // AI slide-over panel

// ── Serialised flag row ────────────────────────────────────
// Date fields are ISO strings (not Date objects) because Next.js App Router
// cannot serialise Date through the server→client boundary.
export interface FlagRow {
  id:             string;        // flag UUID
  type:           string;        // duplicate|double_book|price_mismatch|gap|orphan_night
  reason:         string | null; // rule-based reason text
  status:         string | null; // open|resolved|ignored
  bookingIds:     string[];      // involved booking UUIDs
  createdAt:      string;        // ISO 8601 string (serialised from Date server-side)
  estimatedValue: string | null; // $ value for gap flags (Drizzle numeric → string)
}

interface ReconciliationClientProps {
  conflicts:     FlagRow[]; // conflict flags, pre-sorted by severity
  opportunities: FlagRow[]; // gap flags
  orphanCount:   number;    // count of orphan_night flags
  openConflicts: number;    // count of open conflict flags (for subtitle)
  recoverable:   number;    // sum of open gap values in $ (for subtitle)
}

// ── Badge colour map ───────────────────────────────────────
const TYPE_STYLES: Record<string, string> = {
  duplicate:      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",  // yellow for duplicates
  double_book:    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",              // red for double-bookings
  gap:            "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",           // blue for opportunities
  price_mismatch: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",  // purple for price issues
};

// ── Human labels ───────────────────────────────────────────
const TYPE_LABELS: Record<string, string> = {
  duplicate:      "Duplicate",       // same booking from two channels
  double_book:    "Double-booked",   // two guests on same dates
  gap:            "Opportunity",     // unsold inventory window
  price_mismatch: "Price mismatch",  // nightly rate >25% off base
};

export default function ReconciliationClient({
  conflicts, opportunities, orphanCount, openConflicts, recoverable,
}: ReconciliationClientProps) {
  const router = useRouter();                                            // navigation helper for refresh

  const [selectedFlag, setSelectedFlag] = useState<{                   // currently selected flag for slide-over
    id: string; type: string; reason: string | null; bookingIds: string[];
  } | null>(null);

  function selectFlag(flag: FlagRow) {                                  // click handler: open slide-over for this flag
    setSelectedFlag({ id: flag.id, type: flag.type, reason: flag.reason, bookingIds: flag.bookingIds });
  }

  return (
    <div className="flex gap-4 items-start">                            {/* side-by-side: table + slide-over */}

      {/* ── Main content ─────────────────────────── */}
      <div className="flex flex-col gap-8 flex-1 min-w-0">             {/* flex-1 shrinks to make room for panel */}

        {/* Subtitle */}
        <p className="text-sm text-zinc-500 -mt-4">
          {openConflicts} conflict{openConflicts === 1 ? "" : "s"} need action ·{" "}
          {opportunities.length} revenue opportunit{opportunities.length === 1 ? "y" : "ies"} worth ~${recoverable.toLocaleString()} ·{" "}
          {orphanCount} orphan night{orphanCount === 1 ? "" : "s"}
        </p>

        {/* ── Conflicts section ────────────────────── */}
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">
            Conflicts <span className="text-zinc-400 font-normal">— need action</span>
          </h2>
          {conflicts.length === 0 ? (
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
                    <tr
                      key={flag.id}
                      onClick={() => selectFlag(flag)}                   // click to open AI analysis
                      className={`cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors ${
                        selectedFlag?.id === flag.id                     // highlight selected row
                          ? "bg-violet-50 dark:bg-violet-900/10"         // violet tint when selected
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[flag.type] ?? ""}`}>
                          {TYPE_LABELS[flag.type] ?? flag.type}          {/* human label with fallback */}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 max-w-lg">{flag.reason}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          flag.status === "open"
                            ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"      // muted for open
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"  // green for resolved
                        }`}>{flag.status}</span>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(flag.createdAt).toLocaleDateString()}  {/* parse ISO string to display date */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Opportunities section ────────────────── */}
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
                        ~${Number(flag.estimatedValue ?? 0).toLocaleString()}  {/* parse numeric string */}
                      </td>
                      <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                        {new Date(flag.createdAt).toLocaleDateString()}  {/* parse ISO string */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Orphan footnote ──────────────────────── */}
        {orphanCount > 0 && (
          <p className="text-xs text-zinc-400">
            +{orphanCount} orphan night{orphanCount === 1 ? "" : "s"} (1-night windows, not actionable under a typical 2-night minimum).
          </p>
        )}

      </div>

      {/* ── AI slide-over panel ──────────────────── */}
      {selectedFlag && (                                                  // only render when a flag is selected
        <ConflictSlideOver
          key={selectedFlag.id}                                           // key forces remount on different flag → resets internal state
          flag={selectedFlag}                                             // flag data for analysis
          onClose={() => setSelectedFlag(null)}                           // dismiss without resolving
          onResolved={() => { setSelectedFlag(null); router.refresh(); }} // accept: clear + re-run server component
        />
      )}

    </div>
  );
}
