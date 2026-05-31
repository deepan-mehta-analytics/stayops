// ── Weekly report cron route ──────────────────────────────
// Triggered by Vercel Cron every Monday at 08:00 UTC.
import { createDb } from "@/db/index";                                   // DB factory
import * as schema from "@/db/schema";                                   // table definitions
import { buildWeeklyReport, getCurrentIsoWeek } from "@/lib/weekly-report"; // report builder + week helper

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;                               // expected secret from env
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {       // verify Vercel cron signature
    return new Response("Unauthorized", { status: 401 });               // reject if wrong/missing
  }

  const db        = createDb();                                         // open DB connection
  const summaryMd = await buildWeeklyReport(db);                        // generate Markdown report
  const isoWeek   = getCurrentIsoWeek();                                // current ISO week string

  await db.insert(schema.reports).values({                              // persist report to DB
    period:      isoWeek,                                               // e.g. "2026-W22"
    summaryMd,                                                          // Markdown body
    deliveredTo: process.env.SLACK_WEBHOOK_URL ?? "",                   // record where it was sent
  });

  const webhookUrl = process.env.SLACK_WEBHOOK_URL;                    // read Slack webhook URL
  if (webhookUrl) {                                                     // only POST if URL is configured
    await fetch(webhookUrl, {                                           // send to Slack
      method:  "POST",
      headers: { "Content-Type": "application/json" },                  // JSON body
      body:    JSON.stringify({ text: summaryMd }),                     // Slack incoming webhook payload
    });
  }

  return new Response("OK");                                            // success
}
