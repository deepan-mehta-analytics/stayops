// ── KPI Dashboard ──────────────────────────────────────────
export const dynamic = "force-dynamic";               // always render on demand — never cache stale DB data
import { createDb } from "@/db/index";                // DB factory
import {
  getKpiMetrics,
  getRevenueByProperty,
  getUpcomingTurnovers,
  getOpenConflictCount,
} from "@/lib/dashboard-queries";                    // pre-built query functions
import Link from "next/link";                         // client-side navigation

// ── KPI stat card component — mint top accent border ──────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 border-t-2 [border-top-color:#00e5a0] bg-white shadow-sm p-6">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

// ── Server component — fetches all dashboard data ─────────
export default async function DashboardPage() {
  const db = createDb();                               // server-side DB connection

  // Fetch all four data sources in parallel
  const [kpi, byProperty, turnovers, openConflicts] = await Promise.all([
    getKpiMetrics(db),
    getRevenueByProperty(db),
    getUpcomingTurnovers(db),
    getOpenConflictCount(db),             // conflicts only — gaps/orphans never redden the dashboard
  ]);

  return (
    <div className="flex flex-col gap-8">

      {/* page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-500">Rolling 30-day operational metrics</p>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Occupancy"
          value={`${kpi.occupancy}%`}
          sub="of available nights (30-day)"
        />
        <StatCard
          label="Average Daily Rate"
          value={`$${kpi.adr.toLocaleString()}`}
          sub="per confirmed night"
        />
        <StatCard
          label="Gross Revenue"
          value={`$${kpi.revenue.toLocaleString()}`}
          sub={`${kpi.bookingCount} bookings`}
        />
        {/* Conflicts card — red when conflicts exist, green when clear; links to reconciliation */}
        <Link href="/reconciliation" className="block">
          <div className={`rounded-lg border p-6 h-full transition-colors cursor-pointer ${
            openConflicts > 0
              ? "border-red-200 bg-red-50 hover:bg-red-100"      // action required
              : "border-green-200 bg-green-50 hover:bg-green-100" // all clear
          }`}>
            <p className="text-sm font-medium text-zinc-500">Conflicts</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{openConflicts}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {openConflicts === 0 ? "No conflicts — bookings reconcile cleanly" : "Need action — click to review →"}
            </p>
          </div>
        </Link>
      </div>

      {/* Revenue by property table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Revenue by Property (30-day)</h2>
        {byProperty.length === 0 ? (
          <p className="text-sm text-zinc-400">No confirmed bookings in the last 30 days.</p>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Property</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Revenue</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">Nights</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-700">ADR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {byProperty.map((row, i) => (
                  <tr key={row.name} className={`${i % 2 === 1 ? 'bg-slate-100' : 'bg-white'} hover:bg-slate-200 transition-colors`}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3 text-right">${row.revenue.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">{row.nights}</td>
                    <td className="px-4 py-3 text-right">${row.adr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upcoming turnovers table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Upcoming Turnovers (next 7 days)</h2>
        {turnovers.length === 0 ? (
          <p className="text-sm text-zinc-400">No check-outs in the next 7 days.</p>
        ) : (
          <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Property</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Guest</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Check-out</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-700">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {turnovers.map((t, i) => (
                  <tr key={t.id} className={`${i % 2 === 1 ? 'bg-slate-100' : 'bg-white'} hover:bg-slate-200 transition-colors`}>
                    <td className="px-4 py-3 font-medium">{t.propertyName}</td>
                    <td className="px-4 py-3">{t.guestName}</td>
                    <td className="px-4 py-3">{t.checkOut}</td>
                    <td className="px-4 py-3 text-zinc-500 capitalize">{t.channelName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
