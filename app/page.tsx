// ── Dashboard placeholder — replaced in Phase 1 with Tremor KPI cards ──
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">

      {/* page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Occupancy, ADR, and revenue metrics — coming in Phase 1.
        </p>
      </div>

      {/* scaffold placeholder card */}
      <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-12 text-center">
        <p className="text-zinc-400 text-sm">
          🚧 Phase 0 scaffold — connect Supabase + seed data in the next session.
        </p>
      </div>

    </div>
  );
}
