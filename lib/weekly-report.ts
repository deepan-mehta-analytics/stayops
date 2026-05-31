// ── Imports ───────────────────────────────────────────────
import { eq, gte, and } from "drizzle-orm";                              // Drizzle query helpers
import * as schema from "@/db/schema";                                   // table definitions
import type { Db } from "@/db/index";                                    // DB type from factory
import { getOpenConflictCount, getRevenueByProperty, getUpcomingTurnovers } from "@/lib/dashboard-queries"; // existing query helpers

// ── Report data shape ─────────────────────────────────────
export interface ReportData {
  openConflicts:          number;                                        // count of open conflict flags
  resolvedThisWeek:       number;                                        // flags resolved in last 7 days
  revenueAtRisk:          number;                                        // $ sum of open gap estimatedValues
  upcomingTurnoversCount: number;                                        // check-outs in next 7 days
  topProperty: { name: string; revenue: number } | null;                // highest-revenue property this week
  isoWeek: string;                                                       // ISO week string e.g. "2026-W22"
}

// ── ISO week helper ────────────────────────────────────────
export function getCurrentIsoWeek(): string {
  const now        = new Date();                                         // current date
  const dayOfWeek  = (now.getDay() + 6) % 7;                            // Mon=0 … Sun=6 (JS getDay: Sun=0)
  const thursday   = new Date(now);                                      // copy for Thursday calculation
  thursday.setDate(now.getDate() - dayOfWeek + 3);                       // ISO rule: week belongs to year of its Thursday
  const yearStart  = new Date(thursday.getFullYear(), 0, 1);             // Jan 1 of Thursday's year
  const weekNum    = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7); // ISO week number
  return `${thursday.getFullYear()}-W${String(weekNum).padStart(2, "0")}`; // format as YYYY-Www
}

// ── Pure formatter: ReportData → Markdown string ──────────
export function formatWeeklyReport(data: ReportData): string {
  const topLine = data.topProperty                                       // format top property line
    ? `${data.topProperty.name} — $${data.topProperty.revenue.toLocaleString()} revenue (last 7 days)` // name + revenue
    : "No data";                                                         // null case
  return [                                                               // build lines array for readability
    `*StayOps Weekly Report — ${data.isoWeek}*`,                        // header with ISO week
    ``,                                                                  // blank line
    `📊 *Conflicts*`,                                                    // section header
    `Open: ${data.openConflicts}   |   Resolved this week: ${data.resolvedThisWeek}   |   Revenue at risk: $${data.revenueAtRisk.toLocaleString()}`, // conflict stats
    ``,                                                                  // blank line
    `🏠 *Turnovers this week*`,                                          // section header
    `${data.upcomingTurnoversCount} check-out${data.upcomingTurnoversCount === 1 ? "" : "s"} scheduled`, // turnover count
    ``,                                                                  // blank line
    `🏆 *Top property*`,                                                 // section header
    topLine,                                                             // top property line
    ``,                                                                  // blank line
    `View dashboard → https://stayops.vercel.app/reconciliation`,       // CTA link
  ].join("\n");                                                          // join with newlines
}

// ── Orchestrator: fetch data then format ──────────────────
export async function buildWeeklyReport(db: Db): Promise<string> {
  const sevenDaysAgo = new Date();                                       // start building 7-days-ago date
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);                     // subtract 7 days

  const openConflicts = await getOpenConflictCount(db);                 // count open conflict flags

  const resolvedRows = await db                                          // count flags resolved this week
    .select({ id: schema.reconciliationFlags.id })                       // only need IDs for counting
    .from(schema.reconciliationFlags)
    .where(
      and(
        eq(schema.reconciliationFlags.status, "resolved"),               // resolved flags only
        gte(schema.reconciliationFlags.resolvedAt, sevenDaysAgo),        // resolved within last 7 days
      )
    );
  const resolvedThisWeek = resolvedRows.length;                         // count resolved this week

  const gapRows = await db                                               // fetch open gap flags for revenue at risk
    .select({ estimatedValue: schema.reconciliationFlags.estimatedValue }) // only need the value
    .from(schema.reconciliationFlags)
    .where(
      and(
        eq(schema.reconciliationFlags.status, "open"),                   // open flags only
        eq(schema.reconciliationFlags.type, "gap"),                      // gap type only
      )
    );
  const revenueAtRisk = gapRows.reduce((sum, r) => sum + Number(r.estimatedValue ?? 0), 0); // sum estimated values

  const turnovers            = await getUpcomingTurnovers(db);          // upcoming check-outs
  const upcomingTurnoversCount = turnovers.length;                      // count

  const byProperty = await getRevenueByProperty(db);                    // revenue by property (sorted desc)
  const topProperty = byProperty[0]                                     // pick highest-revenue property
    ? { name: byProperty[0].name, revenue: byProperty[0].revenue }      // extract name + revenue
    : null;                                                              // null if no properties

  const isoWeek = getCurrentIsoWeek();                                  // current ISO week string

  return formatWeeklyReport({                                            // delegate to pure formatter
    openConflicts,
    resolvedThisWeek,
    revenueAtRisk,
    upcomingTurnoversCount,
    topProperty,
    isoWeek,
  });
}
