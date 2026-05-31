// ── Accept resolution route ───────────────────────────────
import { createDb } from "@/db/index";                                   // DB factory
import * as schema from "@/db/schema";                                   // table definitions
import { eq } from "drizzle-orm";                                        // equality operator
import { resolveFlag } from "@/lib/ai-agent";                            // named export for RBAC seam

export async function POST(req: Request) {
  const { flagId, proposedAction, confidence } = await req.json();      // extract body fields

  const db = createDb();                                                 // open DB connection

  await db                                                               // store the AI confidence score
    .update(schema.reconciliationFlags)
    .set({ aiConfidence: confidence as number })                         // cast: JSON numbers arrive as number
    .where(eq(schema.reconciliationFlags.id, flagId));                   // filter to this flag

  await resolveFlag(db, flagId as string, proposedAction as string);    // resolve the flag (audit fields written here)

  return new Response("OK");                                             // success
}
