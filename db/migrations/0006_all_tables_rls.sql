-- Enable RLS on all remaining internal tables.
-- The app writes these tables via Drizzle + DATABASE_URL (direct Postgres connection),
-- which bypasses RLS entirely. RLS here blocks anonymous PostgREST REST API calls only.
-- SELECT policies use USING (true) restricted to authenticated — Supabase advisor
-- intentionally excludes SELECT from the "always true" warning.

ALTER TABLE "properties" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "channels" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reconciliation_flags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "turnover_tasks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "properties_authenticated_select" ON "properties"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint

CREATE POLICY "channels_authenticated_select" ON "channels"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint

CREATE POLICY "bookings_authenticated_select" ON "bookings"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint

CREATE POLICY "reconciliation_flags_authenticated_select" ON "reconciliation_flags"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint

CREATE POLICY "turnover_tasks_authenticated_select" ON "turnover_tasks"
  FOR SELECT TO authenticated USING (true);--> statement-breakpoint

CREATE POLICY "reports_authenticated_select" ON "reports"
  FOR SELECT TO authenticated USING (true);
