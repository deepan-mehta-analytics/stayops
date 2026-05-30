// ── Imports ────────────────────────────────────────────────
import { type Db } from "@/db/index";                 // DB type
import * as schema from "@/db/schema";                // table definitions
import { eq, ne } from "drizzle-orm";                 // query helpers

// ── Types ──────────────────────────────────────────────────
export type FlagType = "duplicate" | "double_book" | "gap" | "price_mismatch"; // four detection categories

export interface ReconciliationResult {               // returned by runReconciliation
  flagsCreated: number;                               // new flags inserted this run
  flagsSkipped: number;                               // flags that already existed (idempotent)
  breakdown: Record<FlagType, number>;                // count by type
}

// ── Date helpers ───────────────────────────────────────────
function daysBetween(a: string, b: string): number {  // days from date-string a to date-string b
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
  );
}

// ── Idempotency key ────────────────────────────────────────
function flagKey(type: FlagType, ids: string[]): string { // stable key to detect duplicate flags
  return `${type}:${[...ids].sort().join(",")}`;          // sort IDs so order doesn't matter
}

// ── Main engine ────────────────────────────────────────────
export async function runReconciliation(db: Db): Promise<ReconciliationResult> {

  // ── Fetch all confirmed bookings with property base rates ──
  const rows = await db
    .select({
      id:           schema.bookings.id,
      propertyId:   schema.bookings.propertyId,
      propertyName: schema.properties.name,
      baseRate:     schema.properties.baseRate,
      guestName:    schema.bookings.guestName,
      checkIn:      schema.bookings.checkIn,
      checkOut:     schema.bookings.checkOut,
      nightlyRate:  schema.bookings.nightlyRate,
      sourceRowHash:schema.bookings.sourceRowHash,
    })
    .from(schema.bookings)
    .innerJoin(schema.properties, eq(schema.bookings.propertyId, schema.properties.id))
    .where(ne(schema.bookings.status, "cancelled"));

  // ── Group bookings by property ─────────────────────────
  const byProperty = new Map<string, typeof rows>();  // propertyId → bookings array
  for (const row of rows) {
    if (!byProperty.has(row.propertyId)) byProperty.set(row.propertyId, []);
    byProperty.get(row.propertyId)!.push(row);
  }

  // ── Fetch existing open flags for idempotency check ───
  const existingFlags = await db
    .select({ bookingIds: schema.reconciliationFlags.bookingIds, type: schema.reconciliationFlags.type })
    .from(schema.reconciliationFlags)
    .where(ne(schema.reconciliationFlags.status, "ignored"));

  const existingKeys = new Set(                       // set of flagKey strings already in DB
    existingFlags.map((f) => flagKey(f.type as FlagType, f.bookingIds))
  );

  // ── Collect flags to insert ────────────────────────────
  const toInsert: Array<{
    bookingIds: string[];
    type: FlagType;
    reason: string;
  }> = [];

  for (const [, propBookings] of byProperty) {
    // Sort by check_in within property for gap detection
    const sorted = [...propBookings].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    const propName = sorted[0]?.propertyName ?? "Unknown property";

    // ── Duplicate + Double-book: all pairs ─────────────
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];

        // Duplicate: same guest, same exact dates, different source hash
        if (
          a.guestName === b.guestName &&
          a.checkIn   === b.checkIn   &&
          a.checkOut  === b.checkOut  &&
          a.sourceRowHash !== b.sourceRowHash
        ) {
          const key = flagKey("duplicate", [a.id, b.id]);
          if (!existingKeys.has(key)) {
            toInsert.push({
              bookingIds: [a.id, b.id],
              type: "duplicate",
              reason: `Duplicate: ${a.guestName} has the same booking for ${propName} (${a.checkIn}→${a.checkOut}) from two channels`,
            });
            existingKeys.add(key);                    // prevent double-insert within same run
          }
        }

        // Double-book: different guests, overlapping date ranges
        if (
          a.guestName !== b.guestName &&
          a.checkIn   <  b.checkOut  &&
          a.checkOut  >  b.checkIn
        ) {
          const key = flagKey("double_book", [a.id, b.id]);
          if (!existingKeys.has(key)) {
            toInsert.push({
              bookingIds: [a.id, b.id],
              type: "double_book",
              reason: `Double-booked: ${a.guestName} (${a.checkIn}→${a.checkOut}) overlaps with ${b.guestName} (${b.checkIn}→${b.checkOut}) on ${propName}`,
            });
            existingKeys.add(key);
          }
        }
      }

      // ── Gap: consecutive sorted pairs ─────────────────
      if (i < sorted.length - 1) {
        const curr = sorted[i];
        const next = sorted[i + 1];
        const gap = daysBetween(curr.checkOut, next.checkIn); // unsold nights between stays
        if (gap >= 1 && gap <= 3) {
          const key = flagKey("gap", [curr.id, next.id]);
          if (!existingKeys.has(key)) {
            toInsert.push({
              bookingIds: [curr.id, next.id],
              type: "gap",
              reason: `${gap}-night gap on ${propName}: ${curr.checkOut} → ${next.checkIn} (upsell or turnover window)`,
            });
            existingKeys.add(key);
          }
        }
      }
    }

    // ── Price mismatch: each booking vs property base rate ──
    for (const b of propBookings) {
      if (!b.nightlyRate) continue;                   // skip rows without a computed nightly rate
      const rate      = Number(b.nightlyRate);        // parse Drizzle numeric string to number
      const base      = Number(b.baseRate);           // parse property base rate
      const deviation = Math.abs(rate - base) / base; // fractional deviation
      if (deviation > 0.25) {                         // flag if more than 25% off base rate
        const dir = rate > base ? "above" : "below";
        const pct = Math.round(deviation * 100);
        const key = flagKey("price_mismatch", [b.id]);
        if (!existingKeys.has(key)) {
          toInsert.push({
            bookingIds: [b.id],
            type: "price_mismatch",
            reason: `Price mismatch: ${b.guestName} on ${propName} — $${rate}/night is ${pct}% ${dir} base rate $${base}`,
          });
          existingKeys.add(key);
        }
      }
    }
  }

  // ── Insert all new flags in one round-trip ─────────────
  if (toInsert.length > 0) {
    await db.insert(schema.reconciliationFlags).values(
      toInsert.map((f) => ({
        bookingIds: f.bookingIds,
        type:       f.type,
        status:     "open" as const,
        reason:     f.reason,
      }))
    );
  }

  // ── Build result summary ───────────────────────────────
  const breakdown: Record<FlagType, number> = {
    duplicate:      toInsert.filter((f) => f.type === "duplicate").length,
    double_book:    toInsert.filter((f) => f.type === "double_book").length,
    gap:            toInsert.filter((f) => f.type === "gap").length,
    price_mismatch: toInsert.filter((f) => f.type === "price_mismatch").length,
  };

  return {
    flagsCreated: toInsert.length,
    flagsSkipped: existingFlags.length,               // existing flags not re-inserted
    breakdown,
  };
}
