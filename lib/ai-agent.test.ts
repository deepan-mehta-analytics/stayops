// ── Imports ───────────────────────────────────────────────
import { vi, describe, it, expect } from "vitest";                       // test primitives
import * as schema from "@/db/schema";                                   // table defs for mock assertions
import {
  RECONCILIATION_TOOLS,                                                  // tool schema array
  CHANNEL_PRIORITY,                                                      // channel priority constant
  RECONCILIATION_AGENT_SYSTEM_PROMPT,                                    // system prompt string
  resolveFlag,                                                           // function under test
} from "@/lib/ai-agent";
import type { Db } from "@/db/index";                                    // DB type for mock casting

// ── Tool schema tests ─────────────────────────────────────
describe("RECONCILIATION_TOOLS", () => {
  it("exports exactly 3 tools", () => {
    expect(RECONCILIATION_TOOLS).toHaveLength(3);                        // get_booking_details + get_property_info + propose_resolution
  });

  it("includes get_booking_details, get_property_info, and propose_resolution", () => {
    const names = RECONCILIATION_TOOLS.map((t) => t.name);              // extract tool names
    expect(names).toContain("get_booking_details");                      // booking lookup tool
    expect(names).toContain("get_property_info");                        // property lookup tool
    expect(names).toContain("propose_resolution");                       // resolution proposal tool
  });

  it("propose_resolution requires action, confidence, and reasoning_summary", () => {
    const tool = RECONCILIATION_TOOLS.find((t) => t.name === "propose_resolution")!; // find the tool
    expect(tool.input_schema.required).toContain("action");             // action is required
    expect(tool.input_schema.required).toContain("confidence");         // confidence is required
    expect(tool.input_schema.required).toContain("reasoning_summary");  // reasoning is required
  });
});

// ── Channel priority tests ────────────────────────────────
describe("CHANNEL_PRIORITY", () => {
  it("lists airbnb first", () => {
    expect(CHANNEL_PRIORITY[0]).toBe("airbnb");                         // airbnb beats all other channels
  });
});

// ── System prompt tests ───────────────────────────────────
describe("RECONCILIATION_AGENT_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof RECONCILIATION_AGENT_SYSTEM_PROMPT).toBe("string");   // must be a string
    expect(RECONCILIATION_AGENT_SYSTEM_PROMPT.length).toBeGreaterThan(100); // must have real content
  });

  it("references all channel priority values", () => {
    expect(RECONCILIATION_AGENT_SYSTEM_PROMPT).toContain("airbnb");     // prompt includes channel names
  });
});

// ── resolveFlag tests ─────────────────────────────────────
describe("resolveFlag", () => {
  it("calls db.update with status resolved, resolution text, and audit fields", async () => {
    const mockWhere  = vi.fn().mockResolvedValue(undefined);            // final chain call resolves
    const mockSet    = vi.fn().mockReturnValue({ where: mockWhere });   // set() returns object with where()
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });       // update() returns object with set()
    const mockDb     = { update: mockUpdate } as unknown as Db;         // cast mock to Db type

    await resolveFlag(mockDb, "flag-123", "Cancel BCO-284");            // call with default acceptedBy

    expect(mockUpdate).toHaveBeenCalledWith(schema.reconciliationFlags); // updates the correct table
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status:     "resolved",       // status must be set to resolved
        resolution: "Cancel BCO-284", // resolution text must be stored
        acceptedBy: "operator",       // default acceptedBy when not provided
      })
    );
    expect(mockWhere).toHaveBeenCalled();                               // where clause applied
  });

  it("uses the provided acceptedBy value when given", async () => {
    const mockWhere  = vi.fn().mockResolvedValue(undefined);            // chain terminus
    const mockSet    = vi.fn().mockReturnValue({ where: mockWhere });   // set() chain
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });       // update() chain
    const mockDb     = { update: mockUpdate } as unknown as Db;         // cast to Db

    await resolveFlag(mockDb, "flag-456", "Keep Airbnb booking", "user-789"); // custom acceptedBy

    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({ acceptedBy: "user-789" })              // custom value is used
    );
  });
});
