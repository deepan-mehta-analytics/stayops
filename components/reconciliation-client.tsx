// ── Client wrapper for the reconciliation page ────────────
"use client";                                                            // manages selectedFlag state + router.refresh()

import { useState } from "react";                                        // state hook
import { useRouter } from "next/navigation";                             // for router.refresh() after resolve
import { Zap } from "lucide-react";                                     // analyze affordance icon
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
  duplicate:      "bg-yellow-100 text-yellow-800",  // yellow for duplicates
  double_book:    "bg-red-100 text-red-800",        // red for double-bookings
  gap:            "bg-blue-100 text-blue-800",      // blue for opportunities
  price_mismatch: "bg-purple-100 text-purple-800",  // purple for price issues
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

  const [selectedFlag, setSelectedFlag] = useState<{                   // currently selected flag for AI panel
    id: string; type: string; reason: string | null; bookingIds: string[];
  } | null>(null);

  function selectFlag(flag: FlagRow) {                                  // open AI panel for this flag
    setSelectedFlag({ id: flag.id, type: flag.type, reason: flag.reason, bookingIds: flag.bookingIds });
  }

  return (
    <div className="flex gap-4 items-start">                            {/* side-by-side: table + AI panel */}

      {/* ── Main content ─────────────────────────── */}
      <div className="flex flex-col gap-8 flex-1 min-w-0">             {/* flex-1 shrinks when panel is present */}

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
            <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
              <p className="text-green-700 text-sm">No conflicts — all bookings reconcile cleanly.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Reason</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Detected</th>
                    <th className="px-4 py-3 text-left font-semibold text-violet-600">AI</th>  {/* analyze column */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {conflicts.map((flag) => {
                    const isSelected = selectedFlag?.id === flag.id;    // highlight selected row
                    return (
                      <tr
                        key={flag.id}
                        onClick={() => selectFlag(flag)}                // whole row clickable
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-violet-50"                            // violet tint when selected
                            : "even:bg-slate-50 hover:bg-zinc-100"      // alternating band + hover
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES[flag.type] ?? ""}`}>
                            {TYPE_LABELS[flag.type] ?? flag.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-700 max-w-sm truncate">{flag.reason}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            flag.status === "open"
                              ? "bg-zinc-100 text-zinc-600"
                              : "bg-green-100 text-green-700"
                          }`}>{flag.status}</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 text-xs whitespace-nowrap">
                          {new Date(flag.createdAt).toLocaleDateString()}
                        </td>
                        {/* ⚡ Analyze pill — explicit AI affordance */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            onClick={(e) => { e.stopPropagation(); selectFlag(flag); }}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                              isSelected
                                ? "bg-violet-600 text-white"                                       // selected: filled violet
                                : "bg-white border border-violet-200 text-violet-600 hover:bg-violet-50 hover:border-violet-400"  // idle: white bg so Zap amber shows
                            }`}
                          >
                            <Zap className={`w-3 h-3 ${isSelected ? "text-white" : "text-amber-500"}`} />
                            {isSelected ? "Selected" : "Analyze"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
            <div className="rounded-lg border border-zinc-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Window</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Detail</th>
                    <th className="px-4 py-3 text-right font-semibold text-zinc-700">Recoverable</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Detected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {opportunities.map((flag) => (
                    <tr key={flag.id} className="even:bg-slate-50 hover:bg-zinc-100">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLES.gap}`}>
                          {TYPE_LABELS.gap}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 max-w-sm truncate">{flag.reason}</td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap">
                        ~${Number(flag.estimatedValue ?? 0).toLocaleString()}
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

        {/* ── Orphan footnote ──────────────────────── */}
        {orphanCount > 0 && (
          <p className="text-xs text-zinc-400">
            +{orphanCount} orphan night{orphanCount === 1 ? "" : "s"} (1-night windows, not actionable under a typical 2-night minimum).
          </p>
        )}

      </div>

      {/* ── AI panel — always visible; shows empty state until a row is selected ── */}
      <ConflictSlideOver
        key={selectedFlag?.id ?? "empty"}                               // remount on flag change to reset internal state
        flag={selectedFlag}
        onClose={() => setSelectedFlag(null)}
        onResolved={() => { setSelectedFlag(null); router.refresh(); }}
      />

    </div>
  );
}
