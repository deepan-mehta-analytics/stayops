// ── Supabase keepalive cron route ─────────────────────────────
// Pinged every 5 days via cron-job.org to prevent Supabase free-tier
// from pausing the project due to inactivity (threshold: 7 days).
import { createDb } from "@/db/index";                  // Drizzle DB factory (postgres.js + SSL)
import { sql }      from "drizzle-orm";                 // raw SQL template tag

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;               // expected secret from env
  if (req.headers.get("authorization") !== `Bearer ${secret}`) { // verify caller signature
    return new Response("Unauthorized", { status: 401 }); // reject if wrong or missing
  }

  const db = createDb();                                // open DB connection
  await db.execute(sql`SELECT 1`);                      // minimal ping — keeps Supabase active

  return new Response("OK");                            // success
}
