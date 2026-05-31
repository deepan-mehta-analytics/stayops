"use client";

// ── Import form — CSV and Google Sheets tabs ──────────────
import { useState } from "react";                     // React state for form and feedback

type Tab = "csv" | "sheets";                          // two supported import methods

interface ImportResult {                               // shape returned by both API routes
  inserted:     number;
  skipped:      number;
  errors:       string[];
  flagsCreated: number;
}

export function ImportForm() {
  const [activeTab, setActiveTab] = useState<Tab>("csv");      // selected import method
  const [loading, setLoading]     = useState(false);           // request in flight
  const [result, setResult]       = useState<ImportResult | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Reset feedback when switching tabs
  function switchTab(tab: Tab) {
    setActiveTab(tab);
    setResult(null);
    setError(null);
  }

  // ── CSV submit ─────────────────────────────────────────
  async function handleCsvSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const form = e.currentTarget;
    const file = (form.elements.namedItem("file") as HTMLInputElement).files?.[0];
    if (!file) { setError("No file selected"); setLoading(false); return; }

    const body = new FormData();
    body.append("file", file);                         // attach CSV file to multipart request

    const res  = await fetch("/api/import/csv", { method: "POST", body });
    const data = await res.json() as ImportResult & { error?: string };

    if (!res.ok) { setError(data.error ?? "Import failed"); }
    else         { setResult(data); }
    setLoading(false);
  }

  // ── Sheets submit ──────────────────────────────────────
  async function handleSheetsSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const form = e.currentTarget;
    const url  = (form.elements.namedItem("sheetUrl") as HTMLInputElement).value.trim();

    const res  = await fetch("/api/import/sheets", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ url }),                // pass sheet URL to route handler
    });
    const data = await res.json() as ImportResult & { error?: string };

    if (!res.ok) { setError(data.error ?? "Import failed"); }
    else         { setResult(data); }
    setLoading(false);
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">

      {/* tab bar */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        {(["csv", "sheets"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => switchTab(tab)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-zinc-900 dark:border-zinc-50 text-zinc-900 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            {tab === "csv" ? "CSV Upload" : "Google Sheets"}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* CSV tab */}
        {activeTab === "csv" && (
          <form onSubmit={handleCsvSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">CSV File</label>
              <p className="text-xs text-zinc-500 mb-2">
                Required columns:{" "}
                <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-xs">
                  property_name, channel, guest_name, check_in, check_out
                </code>
                {" "}· Optional:{" "}
                <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 rounded text-xs">
                  gross, fees
                </code>
              </p>
              <input
                name="file"
                type="file"
                accept=".csv"
                required
                className="block w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-zinc-100 dark:file:bg-zinc-800 hover:file:bg-zinc-200 dark:hover:file:bg-zinc-700 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="self-start px-4 py-2 rounded bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {loading ? "Importing…" : "Import CSV"}
            </button>
          </form>
        )}

        {/* Sheets tab */}
        {activeTab === "sheets" && (
          <form onSubmit={handleSheetsSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Google Sheets URL or Spreadsheet ID</label>
              <p className="text-xs text-zinc-500 mb-2">
                Sheet must be shared with the service account. Same column format as CSV.
              </p>
              <input
                name="sheetUrl"
                type="text"
                required
                placeholder="https://docs.google.com/spreadsheets/d/…"
                className="block w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="self-start px-4 py-2 rounded bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-700 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
            >
              {loading ? "Importing…" : "Import from Sheets"}
            </button>
          </form>
        )}

        {/* Error feedback */}
        {error && (
          <div className="mt-4 p-3 rounded bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Success feedback */}
        {result && (
          <div className="mt-4 p-3 rounded bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-300">
            <p className="font-medium">Import complete</p>
            <p className="mt-1">
              {result.inserted} inserted · {result.skipped} skipped (duplicates)
              {result.flagsCreated > 0 && ` · ${result.flagsCreated} new flags detected`}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-disc list-inside text-xs text-red-600 dark:text-red-400">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
