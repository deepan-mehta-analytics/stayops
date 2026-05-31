import { NextResponse } from "next/server";                      // Next.js response helper — builds typed Response objects
import { z } from "zod";                                         // runtime schema validation library
import { createDb } from "@/db/index";                           // DB factory — called at request time, not module load
import { leads } from "@/db/schema";                             // Drizzle table definition for the leads table

// ── Zod schema for incoming POST body ────────────────────────────────────────
const LeadSchema = z.object({
  email:          z.string().email(),                            // required — must be a valid email address format
  propertyCount:  z.string().max(20).optional(),                 // "1" | "2-5" | "6-15" | "16+" — how many properties the operator manages
  channelsUsed:   z.string().max(500).optional(),                // comma-separated channel names e.g. "airbnb,booking,direct"
  message:        z.string().max(1000).optional(),               // optional free-text enquiry from the form
  utmSource:      z.string().max(100).optional(),                // UTM tracking: identifies the traffic source
  utmMedium:      z.string().max(100).optional(),                // UTM tracking: identifies the marketing medium
  utmCampaign:    z.string().max(100).optional(),                // UTM tracking: identifies the campaign name
  posthogSession: z.string().max(200).optional(),                // PostHog session ID — used to join leads to funnel events
  source:         z.string().max(50).optional(),                 // "organic" | "paid" | "direct" | "referral"
  hp:             z.string().optional(),                         // honeypot field — any string accepted by Zod; emptiness enforced in handler logic
});

// ── POST /api/leads — capture a new lead enquiry ─────────────────────────────
export async function POST(req: Request): Promise<Response> {
  const raw = await req.json().catch(() => ({}));                // parse JSON body; fall back to empty object on malformed input

  // ── Validate against schema ───────────────────────────────────────────────
  const parsed = LeadSchema.safeParse(raw);                      // non-throwing validation — returns success flag + data or errors
  if (!parsed.success) {                                         // validation failed — return a 400 with structured error details
    return NextResponse.json(
      { error: "Invalid request", issues: parsed.error.flatten().fieldErrors }, // flattened Zod errors per field
      { status: 400 }                                            // 400 Bad Request
    );
  }

  // ── Destructure validated fields ──────────────────────────────────────────
  const {
    email,          // required email — mapped to contact column
    propertyCount,  // optional operator property count bucket
    channelsUsed,   // optional comma-separated channel list
    message,        // optional free-text enquiry body
    utmSource,      // optional UTM tracking field
    utmMedium,      // optional UTM tracking field
    utmCampaign,    // optional UTM tracking field
    posthogSession, // optional PostHog session ID
    source,         // optional traffic source label
    hp,             // honeypot field — must remain empty
  } = parsed.data;

  // ── Honeypot guard — silent 200 to confuse bots ───────────────────────────
  if (hp && hp.length > 0) {                                     // hp should be empty; any content means a bot filled the form
    return NextResponse.json({ ok: true }, { status: 200 });    // pretend success — bots will not retry a 200; humans never fill this field
  }

  // ── Persist lead to database ──────────────────────────────────────────────
  const db = createDb();                                         // open DB connection at request time (after env vars are loaded)
  await db.insert(leads).values({                                // Drizzle typed insert into the leads table
    contact:        email,                                       // email stored in the contact column per schema design
    propertyCount:  propertyCount  ?? null,                      // optional — null if the operator did not provide a count
    channelsUsed:   channelsUsed   ?? null,                      // optional — null if no channel information was given
    message:        message        ?? null,                      // optional — null if no enquiry message was written
    utmSource:      utmSource      ?? null,                      // UTM source — null if traffic arrived without UTM params
    utmMedium:      utmMedium      ?? null,                      // UTM medium — null if not tracked
    utmCampaign:    utmCampaign    ?? null,                      // UTM campaign — null if not tracked
    posthogSession: posthogSession ?? null,                      // PostHog session — null if analytics not initialised
    source:         source         ?? "organic",                 // default to "organic" when no explicit source is provided
  });

  return NextResponse.json({ ok: true }, { status: 201 });       // 201 Created — lead successfully captured
}
