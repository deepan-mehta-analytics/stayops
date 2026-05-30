// ── Import pipeline — shared by CSV and Sheets routes ─────
import { createHash } from "crypto";                  // SHA-256 for source_row_hash
import { type Db } from "@/db/index";                 // DB type
import * as schema from "@/db/schema";                // table definitions
import { runReconciliation } from "@/lib/reconciliation"; // run after every import

// ── Input row shape (from CSV or Sheets) ──────────────────
export interface ImportRow {                           // one booking row from any source
  property_name: string;                              // matched case-insensitively to properties.name
  channel:       string;                              // "airbnb" | "booking" | "direct" or any string
  guest_name:    string;
  check_in:      string;                              // YYYY-MM-DD
  check_out:     string;                              // YYYY-MM-DD
  gross?:        string | number;                     // total booking value (optional)
  fees?:         string | number;                     // platform fee (optional)
}

// ── Pipeline result ────────────────────────────────────────
export interface ImportResult {                        // returned to the calling route handler
  inserted:     number;                               // rows newly added
  skipped:      number;                               // rows skipped due to duplicate hash
  errors:       string[];                             // per-row error messages
  flagsCreated: number;                               // new reconciliation flags written after import
}

// ── SHA-256 row hash ───────────────────────────────────────
function makeHash(...parts: string[]): string {        // pipe-joined input → 64-char hex digest
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

// ── Main pipeline function ────────────────────────────────
export async function processImportRows(
  rows: ImportRow[],
  db: Db
): Promise<ImportResult> {
  const errors: string[] = [];                         // collect per-row validation errors
  let inserted = 0;
  let skipped  = 0;

  // ── Load all properties once for name→id lookup ────────
  const allProperties = await db
    .select({ id: schema.properties.id, name: schema.properties.name, baseRate: schema.properties.baseRate })
    .from(schema.properties);

  const propByName = new Map(                          // lowercase name → property row
    allProperties.map((p) => [p.name.toLowerCase(), p])
  );

  // ── Load all channels once for quick lookup ────────────
  const allChannels = await db
    .select({ id: schema.channels.id, name: schema.channels.name, propertyId: schema.channels.propertyId })
    .from(schema.channels);

  // ── Process each row ───────────────────────────────────
  for (let i = 0; i < rows.length; i++) {
    const row    = rows[i];
    const rowNum = i + 2;                              // 1-indexed with header row offset

    // Validate required fields are present
    if (!row.property_name || !row.channel || !row.guest_name || !row.check_in || !row.check_out) {
      errors.push(`Row ${rowNum}: missing required field (property_name, channel, guest_name, check_in, check_out)`);
      continue;
    }

    // Resolve property by name (case-insensitive)
    const prop = propByName.get(row.property_name.toLowerCase());
    if (!prop) {
      errors.push(`Row ${rowNum}: property "${row.property_name}" not found — add it to the properties table first`);
      continue;
    }

    // Resolve channel — create if it doesn't exist for this property
    let channel = allChannels.find(
      (c) => c.propertyId === prop.id && c.name.toLowerCase() === row.channel.toLowerCase()
    );
    if (!channel) {
      const [newChan] = await db
        .insert(schema.channels)
        .values({ name: row.channel.toLowerCase(), propertyId: prop.id })
        .returning();
      channel = newChan;
      allChannels.push(newChan);                       // update in-memory cache to avoid duplicate inserts
    }

    // Compute derived numeric fields
    const nights      = Math.round(
      (new Date(row.check_out).getTime() - new Date(row.check_in).getTime()) / 86_400_000
    );
    const base        = Number(prop.baseRate);
    const gross       = row.gross ? Number(row.gross) : base * nights;  // default to base × nights
    const fees        = row.fees  ? Number(row.fees)  : gross * 0.03;   // default to 3% platform fee
    const nightlyRate = nights > 0 ? gross / nights   : base;

    // Build deterministic source_row_hash from identifying fields
    const hash = makeHash(row.guest_name, prop.id, row.check_in, row.check_out, channel.name);

    // Insert with conflict skip on unique source_row_hash
    try {
      const result = await db
        .insert(schema.bookings)
        .values({
          propertyId:    prop.id,
          channelId:     channel.id,
          channelName:   channel.name,
          guestName:     row.guest_name,
          checkIn:       row.check_in,
          checkOut:      row.check_out,
          gross:         gross.toFixed(2),
          fees:          fees.toFixed(2),
          nightlyRate:   nightlyRate.toFixed(2),
          status:        "confirmed",
          sourceRowHash: hash,
        })
        .onConflictDoNothing()                         // unique constraint on source_row_hash
        .returning({ id: schema.bookings.id });

      if (result.length > 0) {
        inserted++;                                    // new row successfully inserted
      } else {
        skipped++;                                     // hash already exists — row is a duplicate
      }
    } catch (err) {
      errors.push(`Row ${rowNum}: ${String(err)}`);
    }
  }

  // ── Trigger reconciliation after all rows are inserted ─
  const reconcileResult = await runReconciliation(db);

  return {
    inserted,
    skipped,
    errors,
    flagsCreated: reconcileResult.flagsCreated,
  };
}
