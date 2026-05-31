// ── Bookings page — list + import ─────────────────────────
export const dynamic = "force-dynamic";               // always render fresh — new bookings added via import
import { createDb } from "@/db/index";                // DB factory
import * as schema from "@/db/schema";                // table definitions
import { eq, ne, desc } from "drizzle-orm";           // query helpers
import { ImportForm } from "./import-form";            // client-side import form

// ── Bookings table — server component ─────────────────────
async function BookingsTable() {
  const db = createDb();

  const bookings = await db
    .select({
      id:           schema.bookings.id,
      propertyName: schema.properties.name,
      guestName:    schema.bookings.guestName,
      checkIn:      schema.bookings.checkIn,
      checkOut:     schema.bookings.checkOut,
      channelName:  schema.bookings.channelName,
      gross:        schema.bookings.gross,
      status:       schema.bookings.status,
    })
    .from(schema.bookings)
    .innerJoin(schema.properties, eq(schema.bookings.propertyId, schema.properties.id))
    .where(ne(schema.bookings.status, "cancelled"))
    .orderBy(desc(schema.bookings.checkIn))
    .limit(100);                                       // cap at 100 rows for demo performance

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Property</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Guest</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Check-in</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Check-out</th>
            <th className="px-4 py-3 text-left font-medium text-zinc-500">Channel</th>
            <th className="px-4 py-3 text-right font-medium text-zinc-500">Gross</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
              <td className="px-4 py-3 font-medium">{b.propertyName}</td>
              <td className="px-4 py-3">{b.guestName}</td>
              <td className="px-4 py-3">{b.checkIn}</td>
              <td className="px-4 py-3">{b.checkOut}</td>
              <td className="px-4 py-3 text-zinc-500 capitalize">{b.channelName ?? "—"}</td>
              <td className="px-4 py-3 text-right">${Number(b.gross ?? 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-400">
        Showing {bookings.length} most recent confirmed bookings
      </div>
    </div>
  );
}

// ── Page — server component ────────────────────────────────
export default async function BookingsPage() {
  return (
    <div className="flex flex-col gap-8">

      {/* page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bookings</h1>
        <p className="mt-1 text-sm text-zinc-500">
          All confirmed bookings across channels. Import new data below.
        </p>
      </div>

      {/* import section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Import Bookings</h2>
        <ImportForm />
      </div>

      {/* bookings list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">All Bookings</h2>
        <BookingsTable />
      </div>

    </div>
  );
}
