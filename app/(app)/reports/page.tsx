// ── Reports page — all-time booking summary ────────────────
export const dynamic = "force-dynamic";               // always query live DB — reports reflect current data
import { createDb } from "@/db/index";                // DB factory
import * as schema from "@/db/schema";                // table definitions
import { eq, ne } from "drizzle-orm";                 // query helpers

export default async function ReportsPage() {
  const db = createDb();

  // Fetch all non-cancelled bookings with property name
  const all = await db
    .select({
      gross:        schema.bookings.gross,
      channelName:  schema.bookings.channelName,
      propertyName: schema.properties.name,
      checkIn:      schema.bookings.checkIn,
      checkOut:     schema.bookings.checkOut,
    })
    .from(schema.bookings)
    .innerJoin(schema.properties, eq(schema.bookings.propertyId, schema.properties.id))
    .where(ne(schema.bookings.status, "cancelled"));

  const totalRevenue = all.reduce((sum, b) => sum + Number(b.gross ?? 0), 0); // all-time gross

  // ── Aggregate by channel ──────────────────────────────
  const byChannel = new Map<string, { bookings: number; revenue: number; nights: number }>();
  for (const b of all) {
    const ch = b.channelName ?? "unknown";
    if (!byChannel.has(ch)) byChannel.set(ch, { bookings: 0, revenue: 0, nights: 0 });
    const entry = byChannel.get(ch)!;
    entry.bookings++;
    entry.revenue += Number(b.gross ?? 0);
    entry.nights  += Math.round(
      (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86_400_000
    );
  }

  // ── Aggregate by property ─────────────────────────────
  const byProperty = new Map<string, { bookings: number; revenue: number; nights: number }>();
  for (const b of all) {
    if (!byProperty.has(b.propertyName)) byProperty.set(b.propertyName, { bookings: 0, revenue: 0, nights: 0 });
    const entry = byProperty.get(b.propertyName)!;
    entry.bookings++;
    entry.revenue += Number(b.gross ?? 0);
    entry.nights  += Math.round(
      (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86_400_000
    );
  }

  return (
    <div className="flex flex-col gap-8">

      {/* page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="mt-1 text-sm text-zinc-500">
          All-time summary · {all.length} confirmed bookings · ${Math.round(totalRevenue).toLocaleString()} total revenue
        </p>
      </div>

      {/* Revenue by channel */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Revenue by Channel</h2>
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Channel</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Bookings</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Nights</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Share</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[...byChannel.entries()]
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([ch, data], i) => (
                <tr key={ch} className={`${i % 2 === 1 ? 'bg-slate-100' : 'bg-white'} hover:bg-slate-200 transition-colors`}>
                  <td className="px-4 py-3 font-medium capitalize">{ch}</td>
                  <td className="px-4 py-3 text-right">{data.bookings}</td>
                  <td className="px-4 py-3 text-right">{data.nights}</td>
                  <td className="px-4 py-3 text-right">${Math.round(data.revenue).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">
                    {totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${data.nights > 0 ? Math.round(data.revenue / data.nights) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by property */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Revenue by Property</h2>
        <div className="rounded-lg border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-zinc-700">Property</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Bookings</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Nights</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Revenue</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">Share</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-700">ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {[...byProperty.entries()]
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([prop, data], i) => (
                <tr key={prop} className={`${i % 2 === 1 ? 'bg-slate-100' : 'bg-white'} hover:bg-slate-200 transition-colors`}>
                  <td className="px-4 py-3 font-medium">{prop}</td>
                  <td className="px-4 py-3 text-right">{data.bookings}</td>
                  <td className="px-4 py-3 text-right">{data.nights}</td>
                  <td className="px-4 py-3 text-right">${Math.round(data.revenue).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-zinc-500">
                    {totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0}%
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${data.nights > 0 ? Math.round(data.revenue / data.nights) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
