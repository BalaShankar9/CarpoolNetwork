-- ============================================================================
-- PRODUCTION SCHEMA VERIFICATION SCRIPT
-- ============================================================================
-- Run this script in Supabase SQL Editor to verify all required objects exist.
-- If any object is missing, the output will show which migrations to apply.
-- ============================================================================

DO $$
DECLARE
  missing_items text := '';
  item_exists boolean;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRODUCTION SCHEMA VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- ============================================================================
  -- 1. CHECK REQUIRED TABLES
  -- ============================================================================
  RAISE NOTICE '--- CHECKING TABLES ---';

  -- conversations
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ conversations table exists';
  ELSE
    RAISE WARNING '❌ conversations table MISSING';
    missing_items := missing_items || '- conversations table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- conversation_members
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_members') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ conversation_members table exists';
  ELSE
    RAISE WARNING '❌ conversation_members table MISSING';
    missing_items := missing_items || '- conversation_members table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- chat_messages
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ chat_messages table exists';
  ELSE
    RAISE WARNING '❌ chat_messages table MISSING';
    missing_items := missing_items || '- chat_messages table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- message_reads
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reads') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ message_reads table exists';
  ELSE
    RAISE WARNING '❌ message_reads table MISSING';
    missing_items := missing_items || '- message_reads table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- recurring_ride_patterns
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_ride_patterns') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ recurring_ride_patterns table exists';
  ELSE
    RAISE WARNING '❌ recurring_ride_patterns table MISSING';
    missing_items := missing_items || '- recurring_ride_patterns table (apply 20260109120000_phase2_rbac_achievements_subscriptions.sql)' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 2. CHECK REQUIRED VIEWS
  -- ============================================================================
  RAISE NOTICE '--- CHECKING VIEWS ---';

  -- profile_public_v
  SELECT EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'profile_public_v') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ profile_public_v view exists';
  ELSE
    RAISE WARNING '❌ profile_public_v view MISSING';
    missing_items := missing_items || '- profile_public_v view (apply 20260107120000_enforce_profile_completion.sql or 20260108100000_fix_profile_public_view.sql)' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 3. CHECK REQUIRED RPC FUNCTIONS
  -- ============================================================================
  RAISE NOTICE '--- CHECKING RPC FUNCTIONS ---';

  -- get_conversations_overview
  SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_conversations_overview') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ get_conversations_overview() function exists';
  ELSE
    RAISE WARNING '❌ get_conversations_overview() function MISSING - MESSAGING WILL FAIL!';
    missing_items := missing_items || '- get_conversations_overview() function (apply 20260105120000_upgrade_messaging_system.sql or 20260106120000_fix_messaging_overview_rpc.sql)' || E'\n';
  END IF;

  -- get_or_create_dm_conversation
  SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'get_or_create_dm_conversation') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ get_or_create_dm_conversation() function exists';
  ELSE
    RAISE WARNING '❌ get_or_create_dm_conversation() function MISSING';
    missing_items := missing_items || '- get_or_create_dm_conversation() function (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- mark_conversation_read
  SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'mark_conversation_read') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ mark_conversation_read() function exists';
  ELSE
    RAISE WARNING '❌ mark_conversation_read() function MISSING';
    missing_items := missing_items || '- mark_conversation_read() function (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- user_can_view_ride
  SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'user_can_view_ride') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ user_can_view_ride() function exists';
  ELSE
    RAISE WARNING '❌ user_can_view_ride() function MISSING';
    missing_items := missing_items || '- user_can_view_ride() function (apply 20260116100000_fix_rides_rls_visibility.sql)' || E'\n';
  END IF;

  -- request_booking
  SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'request_booking') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '✅ request_booking() function exists';
  ELSE
    RAISE WARNING '❌ request_booking() function MISSING';
    missing_items := missing_items || '- request_booking() function' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 4. SUMMARY
  -- ============================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';

  IF missing_items = '' THEN
    RAISE NOTICE '✅ ALL REQUIRED OBJECTS EXIST';
    RAISE NOTICE '';
    RAISE NOTICE 'If you still see PGRST202 errors, run:';
    RAISE NOTICE '  NOTIFY pgrst, ''reload schema'';';
    RAISE NOTICE '';
    RAISE NOTICE 'Or use: scripts/reload_postgrest_schema_cache.sql';
  ELSE
    RAISE WARNING E'❌ MISSING OBJECTS:\n%', missing_items;
    RAISE NOTICE '';
    RAISE NOTICE 'ACTION REQUIRED:';
    RAISE NOTICE '1. Apply the missing migrations listed above';
    RAISE NOTICE '2. Run: NOTIFY pgrst, ''reload schema'';';
    RAISE NOTICE '3. Re-run this verification script';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Also show the current PostgREST schema cache timestamp if available
SELECT NOW() as verification_timestamp;
