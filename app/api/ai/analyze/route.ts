// ── Streaming analysis route ──────────────────────────────
import { createDb } from "@/db/index";                                   // DB factory
import * as schema from "@/db/schema";                                   // table definitions
import { eq } from "drizzle-orm";                                        // equality operator
import { streamAnalysis } from "@/lib/ai-agent";                         // agentic loop function

export async function POST(req: Request) {
  const { flagId } = await req.json();                                   // extract flagId from request body

  const db   = createDb();                                               // open DB connection
  const rows = await db                                                  // fetch the flag
    .select()
    .from(schema.reconciliationFlags)
    .where(eq(schema.reconciliationFlags.id, flagId))                    // filter by ID
    .limit(1);                                                           // expect at most one row
  const flag = rows[0];                                                  // unwrap array

  if (!flag) return new Response("Flag not found", { status: 404 });    // guard: flag must exist

  const stream = await streamAnalysis(                                   // run the agentic loop
    { id: flag.id, type: flag.type, reason: flag.reason, bookingIds: flag.bookingIds }, // flag context
    db,                                                                  // DB for tool calls
  );

  return new Response(stream, {                                          // stream response to client
    headers: { "Content-Type": "text/plain; charset=utf-8" },           // newline-delimited JSON
  });
}
