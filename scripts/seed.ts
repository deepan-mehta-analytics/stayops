// ── Env must load before any module that touches process.env at import time ──
// tsx transforms imports → CJS require() in order, but TypeScript hoists import
// declarations above any statements.  The fix: createDb() is a lazy factory in
// db/index.ts (it doesn't call postgres() at module load), so dotenv can run
// here as a statement, THEN we call createDb() to open the connection.
import { config } from "dotenv";                     // env file loader
import { createDb } from "../db/index";              // lazy DB factory
import * as schema from "../db/schema";              // table definitions for insert types
import { createHash } from "crypto";                 // SHA-256 for source_row_hash

config({ path: ".env.local" });                      // load DATABASE_URL before createDb() runs
const db = createDb();                               // open postgres connection now that env is set

// ── Types ─────────────────────────────────────────────────
type PropertyRow = typeof schema.properties.$inferSelect;      // shape returned by .returning()
type ChannelRow  = typeof schema.channels.$inferSelect;        // shape returned by .returning()
type BookingInsert = typeof schema.bookings.$inferInsert;      // shape accepted by .values()

// ── Date helpers ──────────────────────────────────────────
const TODAY = new Date();                            // reference point for all relative dates
TODAY.setHours(0, 0, 0, 0);                         // normalise to midnight to avoid timezone edge cases

function d(offset: number): Date {                  // return a Date offset days from today
  const dt = new Date(TODAY);                        // clone TODAY so we don't mutate it
  dt.setDate(dt.getDate() + offset);                 // apply the signed day offset
  return dt;
}

function fmt(date: Date): string {                   // format Date to ISO YYYY-MM-DD string
  return date.toISOString().split("T")[0];           // take only the date portion of ISO string
}

function nightsBetween(checkIn: string, checkOut: string): number {  // count nights in a stay
  const msPerDay = 86_400_000;                        // milliseconds per day constant
  return Math.round(                                  // round to handle DST transitions
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay
  );
}

// ── Hash helpers ──────────────────────────────────────────
function rowHash(...parts: string[]): string {       // SHA-256 of pipe-joined parts → 64 hex chars
  return createHash("sha256")                        // initialise SHA-256 hasher
    .update(parts.join("|"))                         // join fields with separator before hashing
    .digest("hex");                                  // return lowercase hex string
}

// ── Booking row builder ───────────────────────────────────
// Constructs a BookingInsert with all derived fields computed from inputs.
function mkBooking(
  propertyId:   string,       // UUID of the property
  channelId:    string | null,// UUID of the channel (null for imported CSVs)
  channelName:  string,       // "airbnb" | "booking" | "direct"
  guestName:    string,       // full guest name
  checkIn:      string,       // YYYY-MM-DD arrival date
  checkOut:     string,       // YYYY-MM-DD departure date
  baseRate:     number,       // property's standard nightly rate (used for default gross calc)
  grossOverride?: number,     // optional: override computed gross (used for price-mismatch plants)
  hashSuffix    = "",         // optional: extra discriminator so duplicate pairs get different hashes
): BookingInsert {
  const nights     = nightsBetween(checkIn, checkOut);             // number of nights
  const gross      = grossOverride ?? baseRate * nights;           // total value; override for anomaly seeds
  const nightlyRate = gross / nights;                              // per-night rate used by reconciliation engine
  const fees       = gross * 0.03;                                 // approximate 3% platform fee
  return {
    propertyId,
    channelId,
    channelName,
    guestName,
    checkIn,
    checkOut,
    gross:       gross.toFixed(2),        // Drizzle numeric columns expect string representation
    fees:        fees.toFixed(2),         // Drizzle numeric columns expect string representation
    nightlyRate: nightlyRate.toFixed(2),  // Drizzle numeric columns expect string representation
    status:      "confirmed",             // all seed bookings start as confirmed
    sourceRowHash: rowHash(              // unique fingerprint for this booking row
      guestName, propertyId, checkIn, checkOut, channelName, hashSuffix
    ),
  };
}

// ── Occupation tracker ────────────────────────────────────
// Tracks which nights (as integer day-offsets from TODAY) are occupied per property.
// Used to generate clean bookings that don't overlap with planted conflict windows.
const occupied: Record<string, Set<number>> = {};   // propertyId → Set of occupied day offsets

function markOccupied(propId: string, checkIn: string, checkOut: string): void {
  if (!occupied[propId]) occupied[propId] = new Set();   // initialise set on first use
  const start = Math.round(                               // convert checkIn to integer day-offset from TODAY
    (new Date(checkIn).getTime() - TODAY.getTime()) / 86_400_000
  );
  const end = Math.round(                                 // convert checkOut to integer day-offset from TODAY
    (new Date(checkOut).getTime() - TODAY.getTime()) / 86_400_000
  );
  for (let day = start; day < end; day++) {               // mark each occupied night (not including checkOut)
    occupied[propId].add(day);
  }
}

function isFree(propId: string, checkIn: string, checkOut: string): boolean {
  if (!occupied[propId]) return true;                     // no bookings yet → all nights free
  const start = Math.round(
    (new Date(checkIn).getTime() - TODAY.getTime()) / 86_400_000
  );
  const end = Math.round(
    (new Date(checkOut).getTime() - TODAY.getTime()) / 86_400_000
  );
  for (let day = start; day < end; day++) {               // check each night in the proposed window
    if (occupied[propId].has(day)) return false;          // any occupied night → not free
  }
  return true;                                            // all nights free → safe to book
}

// ── Guest name pool ───────────────────────────────────────
// 20 distinct names used for clean bookings; cycled with modulo.
const GUEST_NAMES = [
  "Sarah Johnson",  "Mike Davis",    "Lisa Chen",    "Tom Brown",   "Anna Lee",
  "Chris Park",     "Maya Patel",    "Sam Wilson",   "Zoe Turner",  "Alex Kim",
  "Rachel Green",   "Dan Martinez",  "Nina Scott",   "Owen Clark",  "Priya Shah",
  "Jake Turner",    "Lily Wang",     "Ryan Murphy",  "Sofia Russo", "Lucas Hall",
] as const;

// ── Main seed function ────────────────────────────────────
async function seed(): Promise<void> {

  // ── Step 1: Truncate all tables in reverse FK order ───
  console.log("🌱 Truncating tables...");
  await db.delete(schema.reconciliationFlags);   // no FKs into this table; safe to delete first
  await db.delete(schema.turnoverTasks);         // FK → bookings and properties; delete before both
  await db.delete(schema.bookings);              // FK → properties and channels
  await db.delete(schema.leads);                 // independent table; delete any time
  await db.delete(schema.reports);               // independent table; delete any time
  await db.delete(schema.channels);              // FK → properties; must delete before properties
  await db.delete(schema.properties);            // root table; deleted last
  console.log("✓ Tables cleared\n");

  // ── Step 2: Properties ────────────────────────────────
  const propertyData = [
    { name: "Lakeview Cottage",  address: "42 Lake Rd, Tahoe, CA",       baseRate: "150.00", capacity: 4 },
    { name: "Downtown Studio",   address: "8 Main St, Nashville, TN",    baseRate: "95.00",  capacity: 2 },
    { name: "Beach House",       address: "15 Ocean Dr, Miami, FL",      baseRate: "280.00", capacity: 8 },
    { name: "Mountain Cabin",    address: "301 Pine Ln, Asheville, NC",  baseRate: "185.00", capacity: 6 },
  ];
  const props = await db
    .insert(schema.properties)
    .values(propertyData)
    .returning();                                                          // get inserted rows back with generated UUIDs
  console.log(`✓ ${props.length} properties`);

  // Convenience: named property accessors avoids magic indices later
  const [lakeCottage, dtStudio, beachHouse, mtCabin] = props as [
    PropertyRow, PropertyRow, PropertyRow, PropertyRow
  ];

  // ── Step 3: Channels (3 per property) ─────────────────
  const CHANNEL_NAMES = ["airbnb", "booking", "direct"] as const;        // the three supported platforms
  const channelData = props.flatMap((p) =>                                // one row per property × channel
    CHANNEL_NAMES.map((name) => ({ name, propertyId: p.id }))
  );
  const chans = await db
    .insert(schema.channels)
    .values(channelData)
    .returning();                                                          // get UUIDs for FK use in bookings
  console.log(`✓ ${chans.length} channels`);

  // Helper: find channel row for a property index and channel name
  function ch(
    prop: PropertyRow,
    name: "airbnb" | "booking" | "direct",
  ): ChannelRow {
    return chans.find((c) => c.propertyId === prop.id && c.name === name)!; // non-null assert: we just inserted these
  }

  // ── Step 4: Planted conflict bookings ─────────────────
  // 4 types × 2 instances each = 8 conflict events = 16 conflict-related bookings.
  // Each conflict type is grouped with a comment block explaining what it plants.
  const conflictBookings: BookingInsert[] = [];

  // ── DUPLICATE #1 ──────────────────────────────────────
  // Same guest, same property, same exact dates imported from two different channels.
  // hashSuffix = channel name ensures different source_row_hash despite identical dates.
  {
    const ci = fmt(d(5)), co = fmt(d(8));                               // checkIn T+5, checkOut T+8 (3 nights)
    conflictBookings.push(
      mkBooking(lakeCottage.id, ch(lakeCottage,"airbnb").id,  "airbnb",  "Alice Chen", ci, co, 150, undefined, "airbnb"),
      mkBooking(lakeCottage.id, ch(lakeCottage,"booking").id, "booking", "Alice Chen", ci, co, 150, 455,        "booking"), // booking.com gross slightly different → different hash
    );
    markOccupied(lakeCottage.id, ci, co);                               // mark as occupied so clean bookings skip this window
  }

  // ── DUPLICATE #2 ──────────────────────────────────────
  // Same pattern on a different property (Downtown Studio).
  {
    const ci = fmt(d(12)), co = fmt(d(15));                             // checkIn T+12, checkOut T+15 (3 nights)
    conflictBookings.push(
      mkBooking(dtStudio.id, ch(dtStudio,"airbnb").id,  "airbnb",  "Bob Wilson", ci, co, 95, undefined, "airbnb"),
      mkBooking(dtStudio.id, ch(dtStudio,"direct").id,  "direct",  "Bob Wilson", ci, co, 95, 280,        "direct"), // direct channel gross differs → different hash
    );
    markOccupied(dtStudio.id, ci, co);
  }

  // ── DOUBLE-BOOK #1 ────────────────────────────────────
  // Two different guests booked for overlapping date ranges on the same property.
  // Overlap: T+22 to T+25 (3 nights of double occupancy).
  {
    const ciA = fmt(d(20)), coA = fmt(d(25));                           // Carol: T+20 to T+25 (5 nights)
    const ciB = fmt(d(22)), coB = fmt(d(27));                           // David: T+22 to T+27 — overlaps T+22–T+25
    conflictBookings.push(
      mkBooking(beachHouse.id, ch(beachHouse,"airbnb").id,  "airbnb",  "Carol Davis", ciA, coA, 280),
      mkBooking(beachHouse.id, ch(beachHouse,"booking").id, "booking", "David Lee",   ciB, coB, 280),
    );
    markOccupied(beachHouse.id, ciA, coB);                              // mark the full combined window as occupied
  }

  // ── DOUBLE-BOOK #2 ────────────────────────────────────
  // Same pattern on Mountain Cabin.  Overlap: T+33 to T+35 (2 nights).
  {
    const ciA = fmt(d(30)), coA = fmt(d(35));                           // Emma: T+30 to T+35 (5 nights)
    const ciB = fmt(d(33)), coB = fmt(d(38));                           // Frank: T+33 to T+38 — overlaps T+33–T+35
    conflictBookings.push(
      mkBooking(mtCabin.id, ch(mtCabin,"direct").id,  "direct",  "Emma White",   ciA, coA, 185),
      mkBooking(mtCabin.id, ch(mtCabin,"airbnb").id,  "airbnb",  "Frank Brown",  ciB, coB, 185),
    );
    markOccupied(mtCabin.id, ciA, coB);
  }

  // ── GAP #1 (1-night gap, future) ──────────────────────
  // Grace checks out T+43; Henry checks in T+44.
  // Night of T+43 is the unsold gap (1 night: upsell/turnover opportunity).
  {
    const ciA = fmt(d(40)), coA = fmt(d(43));                           // Grace: T+40 to T+43 (3 nights)
    const ciB = fmt(d(44)), coB = fmt(d(47));                           // Henry: T+44 to T+47 — 1 unsold night: T+43
    conflictBookings.push(
      mkBooking(dtStudio.id, ch(dtStudio,"booking").id, "booking", "Grace Kim",   ciA, coA, 95),
      mkBooking(dtStudio.id, ch(dtStudio,"airbnb").id,  "airbnb",  "Henry Park",  ciB, coB, 95),
    );
    markOccupied(dtStudio.id, ciA, coA);                                // mark first booking window
    markOccupied(dtStudio.id, ciB, coB);                                // mark second booking window (gap night left free)
  }

  // ── GAP #2 (2-night gap, past) ────────────────────────
  // Iris checked out T-17; James checked in T-15.
  // Nights T-17 and T-16 were unsold (2-night gap visible in historical data).
  {
    const ciA = fmt(d(-20)), coA = fmt(d(-17));                         // Iris: T-20 to T-17 (3 nights)
    const ciB = fmt(d(-15)), coB = fmt(d(-12));                         // James: T-15 to T-12 — 2-night gap: T-17, T-16
    conflictBookings.push(
      mkBooking(lakeCottage.id, ch(lakeCottage,"direct").id,   "direct",   "Iris Lee",     ciA, coA, 150),
      mkBooking(lakeCottage.id, ch(lakeCottage,"booking").id,  "booking",  "James Wilson", ciB, coB, 150),
    );
    markOccupied(lakeCottage.id, ciA, coA);
    markOccupied(lakeCottage.id, ciB, coB);
  }

  // ── PRICE MISMATCH #1 (50% above base rate) ───────────
  // Lakeview Cottage base rate = $150/night.
  // This booking has a nightly rate of $225 (+50%) — far outside normal variance.
  {
    const ci = fmt(d(50)), co = fmt(d(53));                             // T+50 to T+53 (3 nights)
    conflictBookings.push(
      mkBooking(lakeCottage.id, ch(lakeCottage,"airbnb").id, "airbnb", "Karen Chen", ci, co, 150, 675), // $225/night gross
    );
    markOccupied(lakeCottage.id, ci, co);
  }

  // ── PRICE MISMATCH #2 (45% below base rate) ───────────
  // Beach House base rate = $280/night.
  // This booking has a nightly rate of $154 (-45%) — likely a pricing error or unapplied discount.
  {
    const ci = fmt(d(55)), co = fmt(d(58));                             // T+55 to T+58 (3 nights)
    conflictBookings.push(
      mkBooking(beachHouse.id, ch(beachHouse,"booking").id, "booking", "Leo Martinez", ci, co, 280, 462), // $154/night gross
    );
    markOccupied(beachHouse.id, ci, co);
  }

  // Insert all conflict bookings in one round-trip
  const insertedConflict = await db
    .insert(schema.bookings)
    .values(conflictBookings)
    .returning();
  console.log(`✓ ${insertedConflict.length} conflict-related bookings planted`);

  // ── Step 5: Clean bookings ────────────────────────────
  // Fill each property's calendar with realistic clean bookings.
  // The occupation tracker ensures we never overlap with planted conflict windows
  // or with each other.
  const cleanBookings: BookingInsert[] = [];
  let guestIdx = 0;                                                     // cycles through GUEST_NAMES pool

  for (const prop of props) {                                           // iterate each property
    const base = parseFloat(prop.baseRate as string);                   // parse numeric string to number
    const propChans = chans.filter((c) => c.propertyId === prop.id);   // channels for this property only

    let cursor = -30;                                                   // start scanning from T-30
    let bookingsForProp = 0;                                            // count clean bookings per property

    while (cursor <= 57 && bookingsForProp < 18) {                     // cap at 18 clean bookings per property
      const nights  = 2 + (guestIdx % 3);                              // 2, 3, or 4 nights — varied for realism
      const ci      = fmt(d(cursor));                                   // proposed checkIn
      const co      = fmt(d(cursor + nights));                          // proposed checkOut

      if (isFree(prop.id, ci, co)) {                                   // only book if this window is unoccupied
        const chan = propChans[guestIdx % propChans.length];            // cycle through channels
        const guest = GUEST_NAMES[guestIdx % GUEST_NAMES.length];      // cycle through guest names
        cleanBookings.push(mkBooking(prop.id, chan.id, chan.name, guest, ci, co, base)); // build the row
        markOccupied(prop.id, ci, co);                                  // prevent future overlap
        cursor += nights + 1;                                           // advance past this stay + 1-day buffer
        guestIdx++;                                                     // advance guest name index
        bookingsForProp++;                                              // increment per-property counter
      } else {
        cursor++;                                                       // window blocked — try the next day
      }
    }
  }

  const insertedClean = await db
    .insert(schema.bookings)
    .values(cleanBookings)
    .returning();
  console.log(`✓ ${insertedClean.length} clean bookings\n`);

  // ── Step 6: Summary ───────────────────────────────────
  const total = insertedConflict.length + insertedClean.length;        // total bookings inserted this run
  const allInserted = [...insertedConflict, ...insertedClean];         // unified array for display

  // Map each conflict group to the inserted booking IDs for traceability
  const dupIds    = insertedConflict.slice(0, 4).map((b) => b.id.slice(0, 8)); // first 4 = two dup pairs
  const dbIds     = insertedConflict.slice(4, 8).map((b) => b.id.slice(0, 8)); // next 4 = two double-book pairs
  const gapIds    = insertedConflict.slice(8, 12).map((b) => b.id.slice(0, 8));// next 4 = two gap pairs
  const pmIds     = insertedConflict.slice(12).map((b) => b.id.slice(0, 8));   // last 2 = two price-mismatch singles

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅  Seed complete — ${total} bookings across ${props.length} properties`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("Planted conflicts (ID prefixes):");
  console.log(`  duplicate       × 2  → ${dupIds.join(", ")}`);
  console.log(`  double_book     × 2  → ${dbIds.join(", ")}`);
  console.log(`  gap             × 2  → ${gapIds.join(", ")}`);
  console.log(`  price_mismatch  × 2  → ${pmIds.join(", ")}`);
  console.log();
  console.log("Per-property counts:");
  for (const p of props) {
    const count = allInserted.filter((b) => b.propertyId === p.id).length;
    console.log(`  ${p.name.padEnd(20)} ${count} bookings  (base rate: $${p.baseRate}/night)`);
  }
  console.log();
}

// ── Entrypoint ────────────────────────────────────────────
seed()                                                                   // kick off the async seed function
  .then(() => process.exit(0))                                           // clean exit on success
  .catch((err) => {                                                      // surface errors clearly
    console.error("❌ Seed failed:", err);
    process.exit(1);                                                     // non-zero exit so CI catches failures
  });
