// ── Reconcile API route ────────────────────────────────────
import { NextResponse } from "next/server";           // Next.js response helper
import { createDb } from "@/db/index";                // DB factory
import { runReconciliation } from "@/lib/reconciliation"; // engine

// POST /api/reconcile — run all 4 detection rules, return flag counts
export async function POST() {
  try {
    const db = createDb();                             // open DB connection per request
    const result = await runReconciliation(db);        // run detection and insert new flags
    return NextResponse.json(result, { status: 200 }); // return breakdown to caller
  } catch (err) {
    console.error("[reconcile] error:", err);
    return NextResponse.json(
      { error: "Reconciliation failed", detail: String(err) },
      { status: 500 }
    );
  }
}
