// ── Imports ───────────────────────────────────────────────
import {                              // pg-core column type constructors
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  timestamp,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";   // SQL template tag for raw default expressions

// ── Properties ────────────────────────────────────────────
// Each rental unit managed by the operator.
export const properties = pgTable("properties", {
  id:        uuid("id").defaultRandom().primaryKey(),                       // auto UUID primary key
  name:      varchar("name", { length: 100 }).notNull(),                    // human-readable unit name
  address:   text("address"),                                               // full street address (optional)
  baseRate:  numeric("base_rate", { precision: 10, scale: 2 }).notNull(),  // standard nightly rate in USD
  capacity:  integer("capacity").notNull().default(2),                      // maximum guest count
  createdAt: timestamp("created_at").defaultNow().notNull(),                // record creation timestamp
});

// ── Channels ──────────────────────────────────────────────
// Booking platforms associated with a property.
export const channels = pgTable("channels", {
  id:         uuid("id").defaultRandom().primaryKey(),                          // auto UUID primary key
  name:       varchar("name", { length: 50 }).notNull(),                        // airbnb | booking | direct
  propertyId: uuid("property_id").references(() => properties.id).notNull(),    // FK → properties
});

// ── Bookings ──────────────────────────────────────────────
// A single reservation from any channel.
export const bookings = pgTable("bookings", {
  id:            uuid("id").defaultRandom().primaryKey(),                        // auto UUID primary key
  propertyId:    uuid("property_id").references(() => properties.id).notNull(), // FK → properties
  channelId:     uuid("channel_id").references(() => channels.id),              // FK → channels (nullable for bulk imports)
  channelName:   varchar("channel_name", { length: 50 }),                       // airbnb | booking | direct — denormalised for display
  guestName:     varchar("guest_name", { length: 100 }).notNull(),              // full guest name
  checkIn:       date("check_in").notNull(),                                    // arrival date YYYY-MM-DD
  checkOut:      date("check_out").notNull(),                                   // departure date YYYY-MM-DD
  gross:         numeric("gross", { precision: 10, scale: 2 }),                 // total booking value before fees
  fees:          numeric("fees", { precision: 10, scale: 2 }),                  // channel platform fee
  nightlyRate:   numeric("nightly_rate", { precision: 10, scale: 2 }),          // computed gross / nights — used by reconciliation engine
  status:        varchar("status", { length: 20 }).default("confirmed"),        // confirmed | cancelled | pending
  sourceRowHash: varchar("source_row_hash", { length: 64 }).unique(),           // SHA-256 of source fields — prevents duplicate imports
  createdAt:     timestamp("created_at").defaultNow().notNull(),                // record creation timestamp
});

// ── Reconciliation flags ───────────────────────────────────
// One row per detected conflict, written by the reconciliation engine (Phase 1)
// and enriched by the AI agent (Phase 2).
export const reconciliationFlags = pgTable("reconciliation_flags", {
  id:          uuid("id").defaultRandom().primaryKey(),                         // auto UUID primary key
  bookingIds:  text("booking_ids").array().notNull().default(sql`'{}'::text[]`), // UUIDs of all involved bookings
  type:        varchar("type", { length: 30 }).notNull(),                       // duplicate | double_book | gap | price_mismatch
  status:      varchar("status", { length: 20 }).default("open"),               // open | resolved | ignored
  reason:      text("reason"),                                                   // plain-English description of the conflict
  aiReasoning: text("ai_reasoning"),                                             // Claude's analysis (populated in Phase 2)
  resolution:  text("resolution"),                                               // how the operator resolved the flag
  createdAt:   timestamp("created_at").defaultNow().notNull(),                  // flag creation timestamp
  resolvedAt:  timestamp("resolved_at"),                                         // when the flag was closed (null = still open)
});

// ── Turnover tasks ────────────────────────────────────────
// Auto-generated cleaning/turnover jobs derived from booking gaps.
export const turnoverTasks = pgTable("turnover_tasks", {
  id:                     uuid("id").defaultRandom().primaryKey(),              // auto UUID primary key
  propertyId:             uuid("property_id").references(() => properties.id).notNull(), // FK → properties
  dueDate:                date("due_date").notNull(),                           // scheduled turnover date
  status:                 varchar("status", { length: 20 }).default("pending"), // pending | in_progress | complete
  generatedFromBookingId: uuid("generated_from_booking_id").references(() => bookings.id), // checkout booking that triggered this
  notes:                  text("notes"),                                         // cleaner instructions (optional)
  createdAt:              timestamp("created_at").defaultNow().notNull(),        // task creation timestamp
});

// ── Leads ─────────────────────────────────────────────────
// Enquiries captured from the public direct-booking landing page (Phase 3).
export const leads = pgTable("leads", {
  id:             uuid("id").defaultRandom().primaryKey(),                      // auto UUID primary key
  source:         varchar("source", { length: 50 }),                            // organic | paid | referral | direct
  utmSource:      varchar("utm_source", { length: 100 }),                       // UTM source query param
  utmMedium:      varchar("utm_medium", { length: 100 }),                       // UTM medium query param
  utmCampaign:    varchar("utm_campaign", { length: 100 }),                     // UTM campaign query param
  contact:        varchar("contact", { length: 200 }),                          // email or phone from enquiry form
  message:        text("message"),                                               // enquiry message body
  posthogSession: varchar("posthog_session", { length: 200 }),                  // PostHog session ID for funnel join
  createdAt:      timestamp("created_at").defaultNow().notNull(),                // lead capture timestamp
});

// ── Reports ───────────────────────────────────────────────
// AI-generated weekly ops reports (Phase 2).
export const reports = pgTable("reports", {
  id:          uuid("id").defaultRandom().primaryKey(),                         // auto UUID primary key
  period:      varchar("period", { length: 50 }).notNull(),                     // ISO week string e.g. "2026-W22"
  summaryMd:   text("summary_md"),                                               // Claude-generated Markdown report body
  generatedAt: timestamp("generated_at").defaultNow().notNull(),                // when Claude generated this report
  deliveredTo: varchar("delivered_to", { length: 200 }),                        // Slack webhook URL or email address
});
