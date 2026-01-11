/*
  # Schema Refresh Notification

  This migration ensures PostgREST reloads its schema cache after
  migrations are applied, preventing PGRST202 errors.

  PGRST202 occurs when PostgREST's cached schema doesn't include
  a function that exists in the database.
*/

-- Force PostgREST to reload its schema cache
-- This fixes PGRST202 errors after applying migrations
NOTIFY pgrst, 'reload schema';

-- Verify key messaging functions exist
DO $$
BEGIN
  -- Check get_conversations_overview
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'get_conversations_overview'
  ) THEN
    RAISE WARNING 'Missing: get_conversations_overview() - Apply messaging migrations first';
  ELSE
    RAISE NOTICE '✅ get_conversations_overview() exists';
  END IF;

  -- Check get_or_create_dm_conversation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'get_or_create_dm_conversation'
  ) THEN
    RAISE WARNING 'Missing: get_or_create_dm_conversation() - Apply messaging migrations first';
  ELSE
    RAISE NOTICE '✅ get_or_create_dm_conversation() exists';
  END IF;

  -- Check mark_conversation_read
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'mark_conversation_read'
  ) THEN
    RAISE WARNING 'Missing: mark_conversation_read() - Apply messaging migrations first';
  ELSE
    RAISE NOTICE '✅ mark_conversation_read() exists';
  END IF;

  -- Check user_can_view_ride
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'user_can_view_ride'
  ) THEN
    RAISE WARNING 'Missing: user_can_view_ride() - Apply RLS visibility migration';
  ELSE
    RAISE NOTICE '✅ user_can_view_ride() exists';
  END IF;

  RAISE NOTICE '------------------------------------';
  RAISE NOTICE 'Schema refresh notification sent to PostgREST';
END $$;
