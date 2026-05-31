// ── Imports ───────────────────────────────────────────────
import { describe, it, expect } from "vitest";                           // test primitives
import { getCurrentIsoWeek, formatWeeklyReport } from "@/lib/weekly-report"; // functions under test

// ── getCurrentIsoWeek tests ───────────────────────────────
describe("getCurrentIsoWeek", () => {
  it("returns a string matching the YYYY-Www format", () => {
    const result = getCurrentIsoWeek();                                  // call the function
    expect(result).toMatch(/^\d{4}-W\d{2}$/);                           // must match ISO week format
  });

  it("returns a year within ±1 of the current calendar year", () => {
    const year = parseInt(getCurrentIsoWeek().split("-W")[0], 10);       // extract year part
    const now  = new Date().getFullYear();                               // current calendar year
    expect(Math.abs(year - now)).toBeLessThanOrEqual(1);                 // ISO year may differ by 1 at year boundary
  });
});

// ── formatWeeklyReport tests ──────────────────────────────
describe("formatWeeklyReport", () => {
  const baseData = {                                                     // shared test fixture
    openConflicts:          2,                                           // open conflict count
    resolvedThisWeek:       1,                                           // resolved this week
    revenueAtRisk:        600,                                           // $ revenue at risk
    upcomingTurnoversCount: 3,                                           // upcoming turnovers
    topProperty: { name: "Beach House", revenue: 4800 },                // top-performing property
    isoWeek: "2026-W22",                                                 // ISO week string
  };

  it("includes the ISO week in the output", () => {
    expect(formatWeeklyReport(baseData)).toContain("W22");               // week number appears in header
  });

  it("includes the open conflict count", () => {
    expect(formatWeeklyReport(baseData)).toContain("2");                 // open conflict count present
  });

  it("includes the top property name", () => {
    expect(formatWeeklyReport(baseData)).toContain("Beach House");       // property name present
  });

  it("includes the revenue at risk formatted with $", () => {
    expect(formatWeeklyReport(baseData)).toContain("$600");              // revenue at risk with dollar sign
  });

  it("returns 'No data' for top property when null", () => {
    const data = { ...baseData, topProperty: null };                    // null top property
    expect(formatWeeklyReport(data)).toContain("No data");               // null case handled
  });
});
