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
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Channel</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Bookings</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Nights</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Share</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[...byChannel.entries()]
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([ch, data]) => (
                <tr key={ch} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Property</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Bookings</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Nights</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Revenue</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Share</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">ADR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[...byProperty.entries()]
                .sort((a, b) => b[1].revenue - a[1].revenue)
                .map(([prop, data]) => (
                <tr key={prop} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
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
