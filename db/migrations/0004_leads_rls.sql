-- Enable Row Level Security on the leads table.
-- The table is public (PostgREST-exposed) so it needs RLS to prevent
-- anonymous reads of lead contact data.
ALTER TABLE "leads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- Public lead capture form uses the anon key — allow INSERT from anyone.
CREATE POLICY "leads_anon_insert" ON "leads"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);--> statement-breakpoint

-- Only authenticated operators (ops console) can read leads.
CREATE POLICY "leads_authenticated_select" ON "leads"
  FOR SELECT
  TO authenticated
  USING (true);
