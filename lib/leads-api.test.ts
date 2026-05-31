import { vi, describe, it, expect, beforeEach } from "vitest";  // test primitives

// ── Mock the DB module before importing the route ─────────────────────────
vi.mock("@/db/index", () => ({
  createDb: vi.fn(),                                             // mock factory — returns controlled DB object
}));

import { createDb } from "@/db/index";                          // import after mock is set up

// ── Helper: build a minimal Request object ─────────────────────────────────
function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/leads", {
    method:  "POST",                                             // POST to the leads endpoint
    headers: { "Content-Type": "application/json" },            // declare JSON payload
    body:    JSON.stringify(body),                               // serialise payload to string
  });
}

describe("POST /api/leads", () => {
  let mockInsert: ReturnType<typeof vi.fn>;                      // typed reference to the insert spy

  beforeEach(() => {
    vi.clearAllMocks();                                          // reset call counts and return values between tests
    mockInsert = vi.fn().mockResolvedValue([]);                  // default: insert resolves successfully
    (createDb as ReturnType<typeof vi.fn>).mockReturnValue({
      insert: () => ({ values: mockInsert }),                    // chain: db.insert(table).values(data)
    });
  });

  it("returns 201 and inserts lead for valid email", async () => {
    const { POST } = await import("@/app/api/leads/route");     // dynamic import so vi.mock applies
    const req = makeRequest({ email: "operator@stays.in" });    // minimal valid payload
    const res = await POST(req);                                 // invoke the route handler
    expect(res.status).toBe(201);                               // 201 Created for a new lead
    expect(mockInsert).toHaveBeenCalledOnce();                  // DB insert must be called exactly once
    const body = await res.json();                              // parse the JSON response body
    expect(body.ok).toBe(true);                                 // response carries a success flag
  });

  it("returns 200 but does NOT insert when honeypot is filled", async () => {
    const { POST } = await import("@/app/api/leads/route");     // dynamic import so vi.mock applies
    const req = makeRequest({ email: "bot@spam.com", hp: "I am a bot" }); // honeypot field filled by bot
    const res = await POST(req);                                 // invoke the route handler
    expect(res.status).toBe(200);                               // silent 200 — bots retry on 4xx, so deceive them
    expect(mockInsert).not.toHaveBeenCalled();                  // no DB write for honeypot submissions
  });

  it("returns 400 for invalid email", async () => {
    const { POST } = await import("@/app/api/leads/route");     // dynamic import so vi.mock applies
    const req = makeRequest({ email: "not-an-email" });         // deliberately malformed email address
    const res = await POST(req);                                 // invoke the route handler
    expect(res.status).toBe(400);                               // 400 Bad Request for Zod validation failure
    expect(mockInsert).not.toHaveBeenCalled();                  // no DB write for invalid payloads
  });

  it("includes optional fields in the insert when provided", async () => {
    const { POST } = await import("@/app/api/leads/route");     // dynamic import so vi.mock applies
    const req = makeRequest({
      email:         "owner@villa.in",                           // valid required field
      propertyCount: "2-5",                                      // operator has 2-5 properties
      channelsUsed:  "airbnb,booking",                           // which booking channels they use
      message:       "Need help with double-books",              // free-text enquiry
    });
    await POST(req);                                             // invoke route handler; response value not needed here
    expect(mockInsert).toHaveBeenCalledWith(                    // assert the exact shape passed to DB
      expect.objectContaining({
        contact:       "owner@villa.in",                         // email mapped to contact column
        propertyCount: "2-5",                                    // optional field passed through
        channelsUsed:  "airbnb,booking",                         // optional field passed through
        message:       "Need help with double-books",            // optional field passed through
      })
    );
  });
});
