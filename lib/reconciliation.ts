// ── Imports ────────────────────────────────────────────────
import { type Db } from "@/db/index";                 // DB type (type-only — erased at build, no DB load in tests)
import * as schema from "@/db/schema";                // table definitions
import { eq, ne } from "drizzle-orm";                 // query helpers

// ── Types ──────────────────────────────────────────────────
export type FlagType =                                // five detection categories
  | "duplicate"
  | "double_book"
  | "gap"
  | "orphan_night"
  | "price_mismatch";

export interface BookingForRecon {                    // row shape the classifier consumes
  id: string;                                         // booking UUID
  propertyId: string;                                 // owning property UUID
  propertyName: string;                               // property display name
  baseRate: string;                                   // property base nightly rate (Drizzle numeric → string)
  guestName: string;                                  // guest full name
  checkIn: string;                                    // arrival YYYY-MM-DD
  checkOut: string;                                   // departure YYYY-MM-DD
  nightlyRate: string | null;                         // computed nightly rate (numeric → string) or null
  sourceRowHash: string | null;                       // import hash, distinguishes duplicate sources
}

export interface DetectedFlag {                       // one classifier output descriptor
  bookingIds: string[];                               // involved booking UUIDs
  type: FlagType;                                     // category
  reason: string;                                     // plain-English explanation
  estimatedValue?: number;                            // $ recoverable — opportunity (gap) flags only
}

export interface ReconciliationResult {               // returned by runReconciliation
  flagsCreated: number;                               // new flags inserted this run
  flagsSkipped: number;                               // existing flags not re-inserted
  breakdown: Record<FlagType, number>;                // count by type
}

// ── Date helper ────────────────────────────────────────────
function daysBetween(a: string, b: string): number {  // whole days from date-string a to b
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / 86_400_000
  );
}

// ── Idempotency key ────────────────────────────────────────
export function flagKey(type: FlagType, ids: string[]): string { // stable key, order-independent
  return `${type}:${[...ids].sort().join(",")}`;
}

// ── Pure classifier ────────────────────────────────────────
// Bookings in → flags out. No DB, no I/O — fully unit-testable.
export function classifyBookings(bookings: BookingForRecon[]): DetectedFlag[] {

  // ── Group bookings by property ─────────────────────────
  const byProperty = new Map<string, BookingForRecon[]>();  // propertyId → bookings
  for (const row of bookings) {
    if (!byProperty.has(row.propertyId)) byProperty.set(row.propertyId, []); // init bucket
    byProperty.get(row.propertyId)!.push(row);              // append to bucket
  }

  const seen = new Set<string>();                     // within-run dedup by flagKey
  const flags: DetectedFlag[] = [];                   // accumulated output

  const push = (f: DetectedFlag) => {                 // add flag unless already queued this run
    const key = flagKey(f.type, f.bookingIds);        // stable dedup key
    if (seen.has(key)) return;                         // skip duplicate within same run
    seen.add(key);                                     // mark as seen
    flags.push(f);                                     // append to output
  };

  for (const [, propBookings] of byProperty) {        // iterate each property's bookings
    const sorted = [...propBookings].sort((a, b) => a.checkIn.localeCompare(b.checkIn)); // chronological order
    const propName = sorted[0]?.propertyName ?? "Unknown property"; // display name for reasons

    // ── Duplicate + Double-book: all pairs within property ──
    for (let i = 0; i < sorted.length; i++) {         // outer booking
      for (let j = i + 1; j < sorted.length; j++) {  // inner booking (always after outer)
        const a = sorted[i];                           // first booking in pair
        const b = sorted[j];                           // second booking in pair

        // Duplicate: same guest, same exact dates, different source hash
        if (
          a.guestName === b.guestName &&               // same guest name
          a.checkIn   === b.checkIn   &&               // same arrival
          a.checkOut  === b.checkOut  &&               // same departure
          a.sourceRowHash !== b.sourceRowHash          // but came from different sources
        ) {
          push({
            bookingIds: [a.id, b.id],
            type: "duplicate",
            reason: `Duplicate: ${a.guestName} has the same booking for ${propName} (${a.checkIn}→${a.checkOut}) from two channels`,
          });
        }

        // Double-book: different guests, overlapping date ranges
        if (
          a.guestName !== b.guestName &&               // different guests
          a.checkIn   <  b.checkOut  &&                // a starts before b ends
          a.checkOut  >  b.checkIn                     // a ends after b starts → overlap
        ) {
          push({
            bookingIds: [a.id, b.id],
            type: "double_book",
            reason: `Double-booked: ${a.guestName} (${a.checkIn}→${a.checkOut}) overlaps with ${b.guestName} (${b.checkIn}→${b.checkOut}) on ${propName}`,
          });
        }
      }

      // ── Gap classification: consecutive sorted pairs only ──
      if (i < sorted.length - 1) {                    // skip last booking (no next to compare)
        const curr = sorted[i];                        // earlier booking
        const next = sorted[i + 1];                    // immediately following booking
        const gap  = daysBetween(curr.checkOut, next.checkIn); // unsold nights between stays

        if (gap === 1) {                               // 1-night gap — orphan window, typically unsellable
          push({
            bookingIds: [curr.id, next.id],
            type: "orphan_night",
            reason: `1-night orphan window on ${propName}: ${curr.checkOut} → ${next.checkIn} (typically unsellable under 2-night minimum)`,
          });
        } else if (gap === 2 || gap === 3) {           // 2–3 night gap — actionable revenue opportunity
          push({
            bookingIds: [curr.id, next.id],
            type: "gap",
            reason: `${gap}-night unsold window on ${propName}: ${curr.checkOut} → ${next.checkIn} — fill via orphan-night discount or direct upsell`,
            estimatedValue: gap * Number(curr.baseRate), // baseRate is a Drizzle numeric string — parse before multiply
          });
        }
        // gap >= 4 → intentional vacancy, no flag; gap <= 0 → overlapping (caught by double_book)
      }
    }

    // ── Price mismatch: each booking vs property base rate ──
    for (const b of propBookings) {                    // check every booking independently
      if (!b.nightlyRate) continue;                   // skip rows without a computed nightly rate
      const rate      = Number(b.nightlyRate);        // parse numeric string to float
      const base      = Number(b.baseRate);           // parse base rate to float
      const deviation = Math.abs(rate - base) / base; // fractional deviation from base
      if (deviation > 0.25) {                         // flag if >25% off base rate
        const dir = rate > base ? "above" : "below";  // direction of deviation
        const pct = Math.round(deviation * 100);       // deviation as integer percent
        push({
          bookingIds: [b.id],
          type: "price_mismatch",
          reason: `Price mismatch: ${b.guestName} on ${propName} — $${rate}/night is ${pct}% ${dir} base rate $${base}`,
        });
      }
    }
  }

  return flags;                                        // all detected flags for this booking set
}

// ── Orchestrator ───────────────────────────────────────────
// Fetches bookings, runs the pure classifier, filters against existing
// flags for idempotency, and inserts the new ones. Thin shell around classifyBookings.
export async function runReconciliation(db: Db): Promise<ReconciliationResult> {

  // ── Fetch all non-cancelled bookings with property base rates ──
  const rows = await db
    .select({
      id:            schema.bookings.id,               // booking UUID
      propertyId:    schema.bookings.propertyId,       // FK to properties
      propertyName:  schema.properties.name,           // property display name
      baseRate:      schema.properties.baseRate,       // base nightly rate (numeric string)
      guestName:     schema.bookings.guestName,        // guest full name
      checkIn:       schema.bookings.checkIn,          // arrival date
      checkOut:      schema.bookings.checkOut,         // departure date
      nightlyRate:   schema.bookings.nightlyRate,      // computed nightly rate (numeric string or null)
      sourceRowHash: schema.bookings.sourceRowHash,    // import hash for duplicate detection
    })
    .from(schema.bookings)
    .innerJoin(schema.properties, eq(schema.bookings.propertyId, schema.properties.id))
    .where(ne(schema.bookings.status, "cancelled"));   // exclude cancelled bookings

  // ── Classify (pure — no DB) ────────────────────────────
  const detected = classifyBookings(rows as BookingForRecon[]); // cast: select shape matches interface

  // ── Fetch existing non-ignored flags for idempotency ──
  const existingFlags = await db
    .select({ bookingIds: schema.reconciliationFlags.bookingIds, type: schema.reconciliationFlags.type })
    .from(schema.reconciliationFlags)
    .where(ne(schema.reconciliationFlags.status, "ignored")); // ignored flags do not block re-detection

  const existingKeys = new Set(                        // set of stable keys already in DB
    existingFlags.map((f) => flagKey(f.type as FlagType, f.bookingIds))
  );

  // ── Filter out already-recorded flags ─────────────────
  const toInsert = detected.filter(
    (f) => !existingKeys.has(flagKey(f.type, f.bookingIds)) // keep only new flags
  );

  // ── Insert new flags in one round-trip ─────────────────
  if (toInsert.length > 0) {
    await db.insert(schema.reconciliationFlags).values(
      toInsert.map((f) => ({
        bookingIds:     f.bookingIds,                  // array of involved UUIDs
        type:           f.type,                        // flag category
        status:         "open" as const,               // all new flags start open
        reason:         f.reason,                      // human-readable explanation
        estimatedValue: f.estimatedValue != null       // numeric column expects a string
          ? String(f.estimatedValue)
          : null,
      }))
    );
  }

  // ── Build result summary ───────────────────────────────
  const breakdown: Record<FlagType, number> = {        // count of new flags by type
    duplicate:      toInsert.filter((f) => f.type === "duplicate").length,
    double_book:    toInsert.filter((f) => f.type === "double_book").length,
    gap:            toInsert.filter((f) => f.type === "gap").length,
    orphan_night:   toInsert.filter((f) => f.type === "orphan_night").length,
    price_mismatch: toInsert.filter((f) => f.type === "price_mismatch").length,
  };

  return {
    flagsCreated: toInsert.length,                     // total new flags inserted
    flagsSkipped: existingFlags.length,                // existing flags not re-inserted
    breakdown,                                         // per-type breakdown
  };
}
