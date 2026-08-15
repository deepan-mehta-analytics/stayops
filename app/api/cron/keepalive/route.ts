// ── Supabase keepalive cron route ─────────────────────────────
// Pinged daily by Vercel Cron (see vercel.json) — Vercel always calls
// via GET, not POST, and auto-attaches Authorization: Bearer $CRON_SECRET.
// Also reachable via an external cron-job.com monitor as a redundant
// backup (needs its own custom Authorization header configured there
// to actually pass the check below, or it'll just get a harmless 401).
import { createDb } from "@/db/index";                  // Drizzle DB factory (postgres.js + SSL)
import { sql }      from "drizzle-orm";                 // raw SQL template tag

async function ping(req: Request) {
  const secret = process.env.CRON_SECRET;               // expected secret from env
  if (req.headers.get("authorization") !== `Bearer ${secret}`) { // verify caller signature
    return new Response("Unauthorized", { status: 401 }); // reject if wrong or missing
  }

  const db = createDb();                                // open DB connection
  await db.execute(sql`SELECT 1`);                      // minimal ping — keeps Supabase active

  return new Response("OK");                            // success
}

export async function GET(req: Request) {
  return ping(req);                                     // what Vercel Cron (and cron-job.com) actually call
}

export async function POST(req: Request) {
  return ping(req);                                     // kept for manual/API-based triggers
}
