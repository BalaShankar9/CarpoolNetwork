-- ============================================================================
-- RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================
-- Purpose: Force PostgREST to reload its schema cache after migrations.
-- Fixes: PGRST202 errors ("Could not find the function/procedure")
-- When: Run AFTER applying any migration that adds/modifies functions/views
-- ============================================================================

-- Send the reload signal to PostgREST (pg_notify version)
SELECT pg_notify('pgrst', 'reload schema');

-- Alternative syntax using NOTIFY (does the same thing, keeping for compatibility)
NOTIFY pgrst, 'reload schema';

-- Confirm and provide next steps
DO $$
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║        POSTGREST SCHEMA CACHE RELOAD REQUESTED               ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '  The schema cache will refresh within a few seconds.';
  RAISE NOTICE '';
  RAISE NOTICE '  NEXT STEPS:';
  RAISE NOTICE '  1. Wait 5-10 seconds for PostgREST to process the reload';
  RAISE NOTICE '  2. Test your app (try the Messages page)';
  RAISE NOTICE '  3. If still failing, run: scripts/verify_schema_contract.sql';
  RAISE NOTICE '';
  RAISE NOTICE '  STILL SEEING PGRST202 ERRORS?';
  RAISE NOTICE '  - Verify function exists: SELECT routine_name FROM information_schema.routines WHERE routine_schema = ''public'';';
  RAISE NOTICE '  - Check permissions: GRANT EXECUTE ON FUNCTION func_name TO authenticated;';
  RAISE NOTICE '  - Last resort: Pause and unpause the Supabase project';
  RAISE NOTICE '';
END $$;

-- Show current timestamp for reference
SELECT NOW() as reload_requested_at;
