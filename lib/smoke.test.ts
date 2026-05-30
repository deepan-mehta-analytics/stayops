// ── Temporary smoke test — verifies the Vitest runner + @/ alias ──
import { describe, it, expect } from "vitest";             // vitest's BDD API

describe("vitest runner", () => {                          // group related assertions
  it("runs", () => {                                       // single passing assertion
    expect(1 + 1).toBe(2);                                 // trivial arithmetic — confirms runner is wired up
  });
});
