-- =============================================================================
-- DATABASE VERIFICATION & SCHEMA CACHE FIX
-- =============================================================================
-- Run this script against your Supabase database to:
-- 1. Verify required tables exist
-- 2. Verify required views exist  
-- 3. Verify required RPC functions exist
-- 4. Refresh PostgREST schema cache
-- =============================================================================

-- Section 1: Table Verification
-- =============================================================================

DO $$
DECLARE
  missing_tables text := '';
BEGIN
  -- Check recurring_ride_patterns
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_ride_patterns') THEN
    missing_tables := missing_tables || '  - recurring_ride_patterns' || E'\n';
  END IF;
  
  -- Check conversations
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    missing_tables := missing_tables || '  - conversations' || E'\n';
  END IF;
  
  -- Check conversation_members
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_members') THEN
    missing_tables := missing_tables || '  - conversation_members' || E'\n';
  END IF;
  
  -- Check chat_messages
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') THEN
    missing_tables := missing_tables || '  - chat_messages' || E'\n';
  END IF;
  
  -- Check message_reads
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reads') THEN
    missing_tables := missing_tables || '  - message_reads' || E'\n';
  END IF;
  
  -- Check admin_permissions
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_permissions') THEN
    missing_tables := missing_tables || '  - admin_permissions' || E'\n';
  END IF;
  
  -- Check admin_audit_log
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_log') THEN
    missing_tables := missing_tables || '  - admin_audit_log' || E'\n';
  END IF;
  
  -- Check user_achievements
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_achievements') THEN
    missing_tables := missing_tables || '  - user_achievements' || E'\n';
  END IF;
  
  -- Check feature_flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'feature_flags') THEN
    missing_tables := missing_tables || '  - feature_flags' || E'\n';
  END IF;

  IF missing_tables <> '' THEN
    RAISE NOTICE E'❌ MISSING TABLES:\n%', missing_tables;
    RAISE NOTICE 'ACTION: Apply migration 20260109120000_phase2_rbac_achievements_subscriptions.sql';
    RAISE NOTICE 'ACTION: Apply migration 20260106120000_fix_messaging_overview_rpc.sql';
  ELSE
    RAISE NOTICE '✅ All required tables exist';
  END IF;
END $$;

-- Section 2: View Verification
-- =============================================================================

DO $$
DECLARE
  missing_views text := '';
BEGIN
  -- Check profile_public_v
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'profile_public_v') THEN
    missing_views := missing_views || '  - profile_public_v' || E'\n';
  END IF;
  
  IF missing_views <> '' THEN
    RAISE NOTICE E'❌ MISSING VIEWS:\n%', missing_views;
    RAISE NOTICE 'ACTION: Apply migration 20260108100000_fix_profile_public_view.sql';
  ELSE
    RAISE NOTICE '✅ All required views exist';
  END IF;
END $$;

-- Section 3: RPC Function Verification
-- =============================================================================

DO $$
DECLARE
  missing_functions text := '';
BEGIN
  -- Check get_conversations_overview
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_conversations_overview'
  ) THEN
    missing_functions := missing_functions || '  - get_conversations_overview()' || E'\n';
  END IF;
  
  -- Check get_or_create_dm_conversation
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_or_create_dm_conversation'
  ) THEN
    missing_functions := missing_functions || '  - get_or_create_dm_conversation(uuid)' || E'\n';
  END IF;
  
  -- Check mark_conversation_read
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'mark_conversation_read'
  ) THEN
    missing_functions := missing_functions || '  - mark_conversation_read(uuid)' || E'\n';
  END IF;
  
  -- Check has_admin_permission
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_admin_permission'
  ) THEN
    missing_functions := missing_functions || '  - has_admin_permission(uuid, text)' || E'\n';
  END IF;
  
  -- Check user_can_view_ride
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'user_can_view_ride'
  ) THEN
    missing_functions := missing_functions || '  - user_can_view_ride(uuid, uuid)' || E'\n';
  END IF;

  IF missing_functions <> '' THEN
    RAISE NOTICE E'❌ MISSING RPC FUNCTIONS:\n%', missing_functions;
    RAISE NOTICE 'ACTION: Apply migration 20260106120000_fix_messaging_overview_rpc.sql';
    RAISE NOTICE 'ACTION: Apply migration 20260109120000_phase2_rbac_achievements_subscriptions.sql';
  ELSE
    RAISE NOTICE '✅ All required RPC functions exist';
  END IF;
END $$;

-- Section 4: RLS Policy Verification
-- =============================================================================

DO $$
DECLARE
  policy_count integer;
BEGIN
  -- Check rides policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rides';
  RAISE NOTICE 'Rides table has % RLS policies', policy_count;
  
  -- Check ride_requests policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ride_requests';
  RAISE NOTICE 'Ride_requests table has % RLS policies', policy_count;
  
  -- Check conversations policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations';
  RAISE NOTICE 'Conversations table has % RLS policies', policy_count;
END $$;

-- Section 5: Rides Status Values Check
-- =============================================================================

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM rides
  WHERE status NOT IN ('active', 'in-progress', 'completed', 'cancelled');
  
  IF invalid_count > 0 THEN
    RAISE NOTICE '⚠️  Found % rides with non-canonical status values', invalid_count;
    RAISE NOTICE 'ACTION: Run status cleanup migration to fix inconsistent values';
  ELSE
    RAISE NOTICE '✅ All ride status values are canonical';
  END IF;
END $$;

-- Section 6: Check Ride Bookings Status Values
-- =============================================================================

DO $$
DECLARE
  invalid_count integer;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM ride_requests
  WHERE status NOT IN ('pending', 'confirmed', 'completed', 'cancelled');
  
  IF invalid_count > 0 THEN
    RAISE NOTICE '⚠️  Found % bookings with non-canonical status values', invalid_count;
    RAISE NOTICE 'ACTION: Run status cleanup migration to fix inconsistent values';
  ELSE
    RAISE NOTICE '✅ All booking status values are canonical';
  END IF;
END $$;

-- Section 7: REFRESH POSTGREST SCHEMA CACHE
-- =============================================================================
-- This is the critical step to fix "PGRST202" errors
-- Run this AFTER applying any missing migrations

NOTIFY pgrst, 'reload schema';

SELECT 'Schema cache refresh requested. PostgREST will reload the API schema.' as message;

-- =============================================================================
-- VERIFICATION SUMMARY
-- =============================================================================

SELECT '========================================' as separator;
SELECT 'DATABASE VERIFICATION COMPLETE' as message;
SELECT '========================================' as separator;
SELECT 'If any ❌ errors above, apply the missing migrations from:' as message;
SELECT '  supabase/migrations/' as path;
SELECT 'Then re-run this script to verify.' as message;
SELECT '========================================' as separator;
