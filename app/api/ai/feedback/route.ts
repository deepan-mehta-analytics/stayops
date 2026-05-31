// ── Operator feedback route ───────────────────────────────
// Called on 👍 or 👎 dismiss. Does NOT resolve the flag — status stays "open".
import { createDb } from "@/db/index";                                   // DB factory
import * as schema from "@/db/schema";                                   // table definitions
import { eq } from "drizzle-orm";                                        // equality operator

export async function POST(req: Request) {
  const { flagId, userFeedback } = await req.json();                    // extract body fields

  const db = createDb();                                                 // open DB connection

  await db                                                               // write feedback label
    .update(schema.reconciliationFlags)
    .set({ userFeedback: userFeedback as string })                       // "correct" | "wrong"
    .where(eq(schema.reconciliationFlags.id, flagId));                   // filter to this flag

  return new Response("OK");                                             // success (flag stays open)
}
