// ── CSV import route ───────────────────────────────────────
import { NextResponse } from "next/server";           // Next.js response helper
import Papa from "papaparse";                         // CSV parser (works server-side)
import { createDb } from "@/db/index";                // DB factory
import { processImportRows, type ImportRow } from "@/lib/import-pipeline"; // shared pipeline

export async function POST(request: Request) {
  try {
    // Parse multipart form data to extract the uploaded file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();                    // read file bytes as UTF-8 string

    // Parse CSV — first row must be a header
    const { data, errors: parseErrors } = Papa.parse<Record<string, string>>(text, {
      header:         true,                            // treat first row as column names
      skipEmptyLines: true,                            // skip blank rows silently
      transformHeader: (h) => h.trim().toLowerCase(), // normalise header case and whitespace
    });

    if (parseErrors.length > 0) {
      return NextResponse.json(
        { error: "CSV parse error", detail: parseErrors[0].message },
        { status: 400 }
      );
    }

    // Map parsed CSV rows to ImportRow shape — handle common header variations
    const rows: ImportRow[] = data.map((row) => ({
      property_name: row.property_name ?? row["property name"] ?? "",
      channel:       row.channel ?? "",
      guest_name:    row.guest_name ?? row["guest name"] ?? "",
      check_in:      row.check_in ?? row["check in"] ?? row.checkin ?? "",
      check_out:     row.check_out ?? row["check out"] ?? row.checkout ?? "",
      gross:         row.gross,
      fees:          row.fees,
    }));

    const db = createDb();
    const result = await processImportRows(rows, db);  // dedup, insert, reconcile

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[import/csv] error:", err);
    return NextResponse.json(
      { error: "Import failed", detail: String(err) },
      { status: 500 }
    );
  }
}
