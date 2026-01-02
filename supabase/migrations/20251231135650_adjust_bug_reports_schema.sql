-- Adjust bug_reports schema for richer reports and AI triage
ALTER TABLE public.bug_reports
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS ai_analysis text,
  ADD COLUMN IF NOT EXISTS ai_fix_suggestion text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS error_id text;

-- Backfill summary/details from legacy columns if present
UPDATE public.bug_reports
SET
  summary = COALESCE(summary, text, 'Bug report'),
  details = COALESCE(details, text, 'Reported issue'),
  route = COALESCE(route, page)
WHERE summary IS NULL OR details IS NULL OR route IS NULL;

-- Reset and add RLS policies for bug_reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own bug reports' AND tablename = 'bug_reports') THEN
    DROP POLICY "Users can insert their own bug reports" ON public.bug_reports;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read their own bug reports' AND tablename = 'bug_reports') THEN
    DROP POLICY "Users can read their own bug reports" ON public.bug_reports;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can read all bug reports' AND tablename = 'bug_reports') THEN
    DROP POLICY "Admin can read all bug reports" ON public.bug_reports;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage bug reports' AND tablename = 'bug_reports') THEN
    DROP POLICY "Admins can manage bug reports" ON public.bug_reports;
  END IF;
END$$;

CREATE POLICY "Users can insert bug reports" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own bug reports" ON public.bug_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR (SELECT is_admin()));

CREATE POLICY "Admins can manage bug reports" ON public.bug_reports
  FOR ALL TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
