// ── KPI Dashboard ──────────────────────────────────────────
export const dynamic = "force-dynamic";               // always render on demand — never cache stale DB data
import { createDb } from "@/db/index";                // DB factory
import {
  getKpiMetrics,
  getRevenueByProperty,
  getUpcomingTurnovers,
  getOpenFlagCount,
} from "@/lib/dashboard-queries";                    // pre-built query functions
import Link from "next/link";                         // client-side navigation

// ── KPI stat card component ────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
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
  const [kpi, byProperty, turnovers, openFlags] = await Promise.all([
    getKpiMetrics(db),
    getRevenueByProperty(db),
    getUpcomingTurnovers(db),
    getOpenFlagCount(db),
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
        {/* Open flags card — red if any open, green if clean */}
        <Link href="/reconciliation" className="block">
          <div className={`rounded-lg border p-6 h-full transition-colors cursor-pointer ${
            openFlags > 0
              ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900"
              : "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900"
          }`}>
            <p className="text-sm font-medium text-zinc-500">Open Flags</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{openFlags}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {openFlags === 0 ? "All bookings clean" : "Click to review →"}
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
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Property</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Nights</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">ADR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {byProperty.map((row) => (
                  <tr key={row.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Property</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Guest</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Check-out</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {turnovers.map((t) => (
                  <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
