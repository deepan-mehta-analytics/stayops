-- Tighten the leads INSERT policy — require contact (email) to be present.
-- WITH CHECK (true) was flagged by Supabase advisor as unrestricted.
-- The real lead form always provides contact; bare PostgREST calls without it are rejected.
DROP POLICY IF EXISTS "leads_anon_insert" ON "leads";--> statement-breakpoint

CREATE POLICY "leads_anon_insert" ON "leads"
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (contact IS NOT NULL AND char_length(trim(contact)) > 0);
