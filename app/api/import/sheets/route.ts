// ── Google Sheets import route ─────────────────────────────
import { NextResponse } from "next/server";           // Next.js response helper
import { google } from "googleapis";                  // Google APIs client
import { createDb } from "@/db/index";                // DB factory
import { processImportRows, type ImportRow } from "@/lib/import-pipeline"; // shared pipeline

// Extract spreadsheet ID from a full Sheets URL or return a bare ID unchanged
function extractSpreadsheetId(urlOrId: string): string {
  const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : urlOrId.trim();
}

export async function POST(request: Request) {
  // Return 501 if credentials are not configured
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!saJson) {
    return NextResponse.json(
      { error: "Google Sheets import not configured. Add GOOGLE_SERVICE_ACCOUNT_JSON to .env.local." },
      { status: 501 }
    );
  }

  try {
    const body = await request.json() as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "url is required in request body" }, { status: 400 });
    }

    const spreadsheetId = extractSpreadsheetId(body.url); // handle full URLs and bare IDs

    // Authenticate with service account credentials
    const credentials = JSON.parse(saJson) as object;
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    // Fetch up to 1000 rows from the first sheet
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A1:Z1000",                               // first 26 columns, up to 1000 rows
    });

    const rawValues = response.data.values;
    if (!rawValues || rawValues.length < 2) {
      return NextResponse.json(
        { error: "Sheet is empty or contains only a header row" },
        { status: 400 }
      );
    }

    // First row is headers — normalise to lowercase trimmed strings
    const headers = (rawValues[0] as string[]).map((h) => h.trim().toLowerCase());

    // Map remaining rows to ImportRow objects using header positions
    const rows: ImportRow[] = (rawValues.slice(1) as string[][]).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
      return {
        property_name: obj.property_name ?? obj["property name"] ?? "",
        channel:       obj.channel ?? "",
        guest_name:    obj.guest_name ?? obj["guest name"] ?? "",
        check_in:      obj.check_in ?? obj["check in"] ?? obj.checkin ?? "",
        check_out:     obj.check_out ?? obj["check out"] ?? obj.checkout ?? "",
        gross:         obj.gross,
        fees:          obj.fees,
      };
    });

    const db = createDb();
    const result = await processImportRows(rows, db);  // dedup, insert, reconcile

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[import/sheets] error:", err);
    return NextResponse.json(
      { error: "Sheets import failed", detail: String(err) },
      { status: 500 }
    );
  }
}
