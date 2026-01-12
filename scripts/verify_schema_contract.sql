-- ============================================================================
-- SCHEMA CONTRACT VERIFICATION SCRIPT
-- ============================================================================
-- Purpose: Verify all required database objects exist for app functionality.
-- Run this in Supabase SQL Editor BEFORE and AFTER applying migrations.
-- 
-- EXIT CRITERIA: All items show ✅ (no ❌ warnings)
-- ============================================================================

DO $$
DECLARE
  missing_items text := '';
  warnings text := '';
  item_exists boolean;
  v_count integer;
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           SCHEMA CONTRACT VERIFICATION                       ║';
  RAISE NOTICE '║           Run Date: %', to_char(now(), 'YYYY-MM-DD HH24:MI:SS TZ');
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  -- ============================================================================
  -- 1. CRITICAL TABLES (App will crash without these)
  -- ============================================================================
  RAISE NOTICE '┌──────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ 1. CRITICAL TABLES                                          │';
  RAISE NOTICE '└──────────────────────────────────────────────────────────────┘';

  -- profiles
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ profiles';
  ELSE
    RAISE WARNING '  ❌ profiles - CRITICAL: App cannot function!';
    missing_items := missing_items || '- profiles table (core schema)' || E'\n';
  END IF;

  -- vehicles
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicles') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ vehicles';
  ELSE
    RAISE WARNING '  ❌ vehicles - CRITICAL: Cannot post rides!';
    missing_items := missing_items || '- vehicles table (core schema)' || E'\n';
  END IF;

  -- rides
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rides') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ rides';
  ELSE
    RAISE WARNING '  ❌ rides - CRITICAL: Core feature missing!';
    missing_items := missing_items || '- rides table (core schema)' || E'\n';
  END IF;

  -- ride_bookings
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ride_bookings') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ ride_bookings';
  ELSE
    RAISE WARNING '  ❌ ride_bookings - CRITICAL: Cannot book rides!';
    missing_items := missing_items || '- ride_bookings table (core schema)' || E'\n';
  END IF;

  -- notifications
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ notifications';
  ELSE
    RAISE WARNING '  ❌ notifications - CRITICAL: No notifications!';
    missing_items := missing_items || '- notifications table' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 2. MESSAGING TABLES (Messages page fails without these)
  -- ============================================================================
  RAISE NOTICE '┌──────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ 2. MESSAGING TABLES                                         │';
  RAISE NOTICE '└──────────────────────────────────────────────────────────────┘';

  -- conversations
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ conversations';
  ELSE
    RAISE WARNING '  ❌ conversations - Messages page will fail!';
    missing_items := missing_items || '- conversations table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- conversation_members
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_members') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ conversation_members';
  ELSE
    RAISE WARNING '  ❌ conversation_members - Messages page will fail!';
    missing_items := missing_items || '- conversation_members table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- chat_messages
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ chat_messages';
  ELSE
    RAISE WARNING '  ❌ chat_messages - Messages page will fail!';
    missing_items := missing_items || '- chat_messages table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- message_reads
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_reads') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ message_reads';
  ELSE
    RAISE WARNING '  ❌ message_reads - Read receipts will fail!';
    missing_items := missing_items || '- message_reads table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- blocks (for safety)
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blocks') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ blocks';
  ELSE
    RAISE WARNING '  ❌ blocks - User blocking will fail!';
    missing_items := missing_items || '- blocks table (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 3. RECURRING RIDES TABLE (Feature-specific)
  -- ============================================================================
  RAISE NOTICE '┌──────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ 3. FEATURE TABLES                                           │';
  RAISE NOTICE '└──────────────────────────────────────────────────────────────┘';

  -- recurring_ride_patterns
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_ride_patterns') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ recurring_ride_patterns';
  ELSE
    RAISE WARNING '  ❌ recurring_ride_patterns - Recurring rides will fail!';
    missing_items := missing_items || '- recurring_ride_patterns table (apply 20260109120000_phase2_rbac_achievements_subscriptions.sql)' || E'\n';
  END IF;

  -- admin_permissions
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_permissions') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ admin_permissions';
  ELSE
    RAISE WARNING '  ❌ admin_permissions - Admin RBAC will fail!';
    missing_items := missing_items || '- admin_permissions table (apply 20260109120000_phase2_rbac_achievements_subscriptions.sql)' || E'\n';
  END IF;

  -- admin_audit_log
  SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_log') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ admin_audit_log';
  ELSE
    RAISE WARNING '  ❌ admin_audit_log - Admin audit trail missing!';
    missing_items := missing_items || '- admin_audit_log table (apply 20260109120000_phase2_rbac_achievements_subscriptions.sql)' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 4. REQUIRED VIEWS
  -- ============================================================================
  RAISE NOTICE '┌──────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ 4. REQUIRED VIEWS                                           │';
  RAISE NOTICE '└──────────────────────────────────────────────────────────────┘';

  -- profile_public_v
  SELECT EXISTS(SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'profile_public_v') INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ profile_public_v';
  ELSE
    RAISE WARNING '  ❌ profile_public_v - Public profile view will fail!';
    missing_items := missing_items || '- profile_public_v view (apply 20260108100000_fix_profile_public_view.sql)' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 5. REQUIRED RPC FUNCTIONS (PGRST202 errors if missing)
  -- ============================================================================
  RAISE NOTICE '┌──────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ 5. REQUIRED RPC FUNCTIONS                                   │';
  RAISE NOTICE '└──────────────────────────────────────────────────────────────┘';

  -- get_conversations_overview (CRITICAL for messaging)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'get_conversations_overview'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ get_conversations_overview()';
  ELSE
    RAISE WARNING '  ❌ get_conversations_overview() - MESSAGING WILL FAIL! (PGRST202)';
    missing_items := missing_items || '- get_conversations_overview() function (apply 20260106120000_fix_messaging_overview_rpc.sql)' || E'\n';
  END IF;

  -- get_or_create_dm_conversation
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'get_or_create_dm_conversation'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ get_or_create_dm_conversation()';
  ELSE
    RAISE WARNING '  ❌ get_or_create_dm_conversation() - Cannot start DMs!';
    missing_items := missing_items || '- get_or_create_dm_conversation() function (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- get_or_create_ride_conversation
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'get_or_create_ride_conversation'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ get_or_create_ride_conversation()';
  ELSE
    RAISE WARNING '  ❌ get_or_create_ride_conversation() - Ride chat will fail!';
    missing_items := missing_items || '- get_or_create_ride_conversation() function (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- mark_conversation_read
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'mark_conversation_read'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ mark_conversation_read()';
  ELSE
    RAISE WARNING '  ❌ mark_conversation_read() - Read receipts will fail!';
    missing_items := missing_items || '- mark_conversation_read() function (apply 20260105120000_upgrade_messaging_system.sql)' || E'\n';
  END IF;

  -- request_booking (core booking RPC)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'request_booking'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ request_booking()';
  ELSE
    RAISE WARNING '  ❌ request_booking() - BOOKING WILL FAIL!';
    missing_items := missing_items || '- request_booking() function' || E'\n';
  END IF;

  -- user_can_view_ride (RLS helper)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'user_can_view_ride'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ user_can_view_ride()';
  ELSE
    RAISE WARNING '  ❌ user_can_view_ride() - Ride visibility may be broken!';
    missing_items := missing_items || '- user_can_view_ride() function (apply 20260116100000_fix_rides_rls_visibility.sql)' || E'\n';
  END IF;

  -- is_profile_complete
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'is_profile_complete'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ is_profile_complete()';
  ELSE
    RAISE WARNING '  ❌ is_profile_complete() - Profile gating may fail!';
    missing_items := missing_items || '- is_profile_complete() function (apply 20260107120000_enforce_profile_completion.sql)' || E'\n';
  END IF;

  -- has_admin_permission (RBAC helper)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name = 'has_admin_permission'
  ) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ has_admin_permission()';
  ELSE
    RAISE WARNING '  ❌ has_admin_permission() - Admin RBAC will fail!';
    missing_items := missing_items || '- has_admin_permission() function (apply 20260109120000_phase2_rbac_achievements_subscriptions.sql)' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 6. ENUM TYPES
  -- ============================================================================
  RAISE NOTICE '┌──────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ 6. ENUM TYPES                                               │';
  RAISE NOTICE '└──────────────────────────────────────────────────────────────┘';

  -- admin_role enum
  SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'admin_role' AND typnamespace = 'public'::regnamespace) INTO item_exists;
  IF item_exists THEN
    RAISE NOTICE '  ✅ admin_role enum';
  ELSE
    -- Check if it's in any namespace
    SELECT EXISTS(SELECT 1 FROM pg_type WHERE typname = 'admin_role') INTO item_exists;
    IF item_exists THEN
      RAISE NOTICE '  ✅ admin_role enum (in pg_catalog)';
    ELSE
      RAISE WARNING '  ❌ admin_role enum - Admin RBAC will fail!';
      missing_items := missing_items || '- admin_role enum (apply 20260109120000_phase2_rbac_achievements_subscriptions.sql)' || E'\n';
    END IF;
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 7. RLS POLICIES SPOT CHECK
  -- ============================================================================
  RAISE NOTICE '┌──────────────────────────────────────────────────────────────┐';
  RAISE NOTICE '│ 7. RLS STATUS CHECK                                         │';
  RAISE NOTICE '└──────────────────────────────────────────────────────────────┘';

  -- Check RLS is enabled on critical tables
  SELECT COUNT(*) INTO v_count
  FROM pg_tables t
  WHERE t.schemaname = 'public' 
    AND t.tablename IN ('profiles', 'rides', 'ride_bookings', 'conversations', 'chat_messages')
    AND NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE c.relname = t.tablename 
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
    );

  IF v_count = 0 THEN
    RAISE NOTICE '  ✅ RLS enabled on critical tables';
  ELSE
    RAISE WARNING '  ⚠️  RLS may be disabled on % critical table(s)', v_count;
    warnings := warnings || '- Check RLS is enabled on profiles, rides, ride_bookings, conversations, chat_messages' || E'\n';
  END IF;

  RAISE NOTICE '';

  -- ============================================================================
  -- 8. SUMMARY
  -- ============================================================================
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║                    VERIFICATION SUMMARY                      ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';

  IF missing_items = '' AND warnings = '' THEN
    RAISE NOTICE '';
    RAISE NOTICE '  ✅ ALL SCHEMA CONTRACT REQUIREMENTS MET';
    RAISE NOTICE '';
    RAISE NOTICE '  If you still see PGRST202 errors, run:';
    RAISE NOTICE '    NOTIFY pgrst, ''reload schema'';';
    RAISE NOTICE '';
    RAISE NOTICE '  Or execute: scripts/reload_postgrest_schema_cache.sql';
    RAISE NOTICE '';
  ELSE
    IF missing_items != '' THEN
      RAISE WARNING E'\n  ❌ MISSING OBJECTS:\n%', missing_items;
    END IF;
    IF warnings != '' THEN
      RAISE WARNING E'\n  ⚠️  WARNINGS:\n%', warnings;
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE '  ACTION REQUIRED:';
    RAISE NOTICE '  1. Apply the missing migrations listed above IN ORDER';
    RAISE NOTICE '  2. Run: NOTIFY pgrst, ''reload schema'';';
    RAISE NOTICE '  3. Re-run this verification script until all ✅';
    RAISE NOTICE '';
  END IF;

  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;

-- Show verification timestamp
SELECT 
  NOW() as verification_timestamp,
  current_database() as database_name,
  current_user as connected_as;
