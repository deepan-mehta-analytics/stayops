// ── Turnover task generation cron route ───────────────────
// Triggered by Vercel Cron every day at midnight UTC.
// Idempotent: only creates tasks for bookings that do not already have one.
import { createDb } from "@/db/index";                                   // DB factory
import * as schema from "@/db/schema";                                   // table definitions
import { and, ne, gte, lte } from "drizzle-orm";                        // query helpers

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;                               // expected secret
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {       // verify cron signature
    return new Response("Unauthorized", { status: 401 });               // reject if wrong/missing
  }

  const db    = createDb();                                             // open DB connection
  const today = new Date().toISOString().split("T")[0];                 // today YYYY-MM-DD
  const in7   = (() => {                                                // 7 days from now
    const d = new Date();                                               // copy current date
    d.setDate(d.getDate() + 7);                                         // advance 7 days
    return d.toISOString().split("T")[0];                               // format YYYY-MM-DD
  })();

  const upcoming = await db                                             // bookings checking out in next 7 days
    .select()
    .from(schema.bookings)
    .where(
      and(
        ne(schema.bookings.status, "cancelled"),                        // exclude cancelled bookings
        gte(schema.bookings.checkOut, today),                           // check-out is today or later
        lte(schema.bookings.checkOut, in7),                             // check-out is within 7 days
      )
    );

  const existing = await db                                             // fetch all existing turnover tasks
    .select({ bookingId: schema.turnoverTasks.generatedFromBookingId }) // only need booking IDs
    .from(schema.turnoverTasks);
  const existingIds = new Set(existing.map((r) => r.bookingId));       // set for O(1) lookup

  const toInsert = upcoming.filter((b) => !existingIds.has(b.id));     // bookings without a task yet

  if (toInsert.length > 0) {                                            // only insert if there's something new
    await db.insert(schema.turnoverTasks).values(                       // batch insert
      toInsert.map((b) => ({
        propertyId:             b.propertyId,                          // FK → properties
        dueDate:                b.checkOut,                            // turnover due on check-out day
        status:                 "pending" as const,                    // new tasks start as pending
        generatedFromBookingId: b.id,                                  // FK → bookings (idempotency key)
      }))
    );
  }

  return Response.json({                                                // return counts for observability
    created: toInsert.length,                                           // how many tasks were created
    skipped: upcoming.length - toInsert.length,                         // how many were already there
  });
}
