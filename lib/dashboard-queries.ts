// ── Dashboard query functions ──────────────────────────────
import { type Db } from "@/db/index";                 // DB type
import * as schema from "@/db/schema";                // table definitions
import { eq, ne, and, gte, lte } from "drizzle-orm";  // query helpers

// ── Rolling-window date helpers ────────────────────────────
function windowStart(): string {                       // 30 days ago as YYYY-MM-DD
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {                          // today as YYYY-MM-DD
  return new Date().toISOString().split("T")[0];
}

function in7Days(): string {                           // 7 days from now as YYYY-MM-DD
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

// ── KPI metrics: occupancy %, ADR, revenue (rolling 30 days) ──
export async function getKpiMetrics(db: Db) {
  const start = windowStart();
  const today = todayStr();

  // Fetch all confirmed bookings that started within the 30-day window
  const bookings = await db
    .select({
      gross:    schema.bookings.gross,
      checkIn:  schema.bookings.checkIn,
      checkOut: schema.bookings.checkOut,
    })
    .from(schema.bookings)
    .where(
      and(
        ne(schema.bookings.status, "cancelled"),
        gte(schema.bookings.checkIn, start),
        lte(schema.bookings.checkIn, today)
      )
    );

  const properties = await db
    .select({ id: schema.properties.id })
    .from(schema.properties);

  const propertyCount = properties.length;             // number of managed properties

  // Aggregate total nights and revenue across all bookings in window
  let totalNights = 0;
  let totalRevenue = 0;
  for (const b of bookings) {
    const nights = Math.round(
      (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86_400_000
    );
    totalNights  += nights;
    totalRevenue += Number(b.gross ?? 0);
  }

  const availableNights = 30 * propertyCount;          // max occupied nights if 100% full
  const occupancy = availableNights > 0
    ? Math.round((totalNights / availableNights) * 100)
    : 0;

  const adr = totalNights > 0
    ? Math.round(totalRevenue / totalNights)
    : 0;

  return {
    occupancy,                                         // 0–100 %
    adr,                                               // USD per night
    revenue: Math.round(totalRevenue),                 // total gross USD
    bookingCount: bookings.length,                     // number of bookings in window
  };
}

// ── Revenue + nights by property (rolling 30 days) ─────────
export async function getRevenueByProperty(db: Db) {
  const start = windowStart();
  const today = todayStr();

  const rows = await db
    .select({
      propertyId:   schema.bookings.propertyId,
      propertyName: schema.properties.name,
      gross:        schema.bookings.gross,
      checkIn:      schema.bookings.checkIn,
      checkOut:     schema.bookings.checkOut,
    })
    .from(schema.bookings)
    .innerJoin(schema.properties, eq(schema.bookings.propertyId, schema.properties.id))
    .where(
      and(
        ne(schema.bookings.status, "cancelled"),
        gte(schema.bookings.checkIn, start),
        lte(schema.bookings.checkIn, today)
      )
    );

  // Aggregate per property in JavaScript
  const byProp = new Map<string, { name: string; revenue: number; nights: number }>();
  for (const row of rows) {
    if (!byProp.has(row.propertyId)) {
      byProp.set(row.propertyId, { name: row.propertyName, revenue: 0, nights: 0 });
    }
    const entry = byProp.get(row.propertyId)!;
    entry.revenue += Number(row.gross ?? 0);
    entry.nights  += Math.round(
      (new Date(row.checkOut).getTime() - new Date(row.checkIn).getTime()) / 86_400_000
    );
  }

  return Array.from(byProp.values())
    .map((p) => ({
      name:    p.name,
      revenue: Math.round(p.revenue),
      nights:  p.nights,
      adr:     p.nights > 0 ? Math.round(p.revenue / p.nights) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);            // highest revenue first
}

// ── Upcoming turnovers: check-outs in the next 7 days ──────
export async function getUpcomingTurnovers(db: Db) {
  const today = todayStr();
  const end   = in7Days();

  return db
    .select({
      id:           schema.bookings.id,
      propertyName: schema.properties.name,
      guestName:    schema.bookings.guestName,
      checkIn:      schema.bookings.checkIn,
      checkOut:     schema.bookings.checkOut,
      channelName:  schema.bookings.channelName,
    })
    .from(schema.bookings)
    .innerJoin(schema.properties, eq(schema.bookings.propertyId, schema.properties.id))
    .where(
      and(
        ne(schema.bookings.status, "cancelled"),
        gte(schema.bookings.checkOut, today),
        lte(schema.bookings.checkOut, end)
      )
    )
    .orderBy(schema.bookings.checkOut);                // soonest checkout first
}

// ── Count of open reconciliation flags ─────────────────────
export async function getOpenFlagCount(db: Db): Promise<number> {
  const rows = await db
    .select({ id: schema.reconciliationFlags.id })
    .from(schema.reconciliationFlags)
    .where(eq(schema.reconciliationFlags.status, "open"));
  return rows.length;
}
