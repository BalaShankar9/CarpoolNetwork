-- ============================================================
-- Messaging Migration Verification Script
-- Run this in Supabase SQL Editor AFTER applying the migration
-- ============================================================

-- 1. Check if migration was applied
SELECT
  version,
  inserted_at,
  CASE
    WHEN version = '20260105120000' THEN '✅ MIGRATION APPLIED'
    ELSE '⚠️  Migration not found'
  END as status
FROM supabase_migrations.schema_migrations
WHERE version = '20260105120000';

-- Expected: 1 row with status '✅ MIGRATION APPLIED'
-- If empty: Migration was NOT applied yet


-- 2. Verify RPC function exists
SELECT
  routine_name,
  routine_type,
  '✅ Function exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_conversations_overview';

-- Expected: 1 row showing the function exists
-- If empty: Migration incomplete or RPC creation failed


-- 3. Verify new columns in chat_messages
SELECT
  column_name,
  data_type,
  is_nullable,
  '✅ Column exists' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'chat_messages'
  AND column_name IN ('client_generated_id', 'reply_to_id', 'metadata', 'attachments', 'deleted_at', 'message_type')
ORDER BY
  CASE column_name
    WHEN 'client_generated_id' THEN 1
    WHEN 'reply_to_id' THEN 2
    WHEN 'metadata' THEN 3
    WHEN 'attachments' THEN 4
    WHEN 'deleted_at' THEN 5
    WHEN 'message_type' THEN 6
  END;

-- Expected: 6 rows (all 6 columns)
-- If less than 6: Some columns missing, migration incomplete


-- 4. Verify new tables exist
SELECT
  table_name,
  '✅ Table exists' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('message_reactions', 'message_deletions', 'conversation_settings', 'blocks')
ORDER BY table_name;

-- Expected: 4 rows (all 4 tables)
-- If less than 4: Some tables missing, migration incomplete


-- 5. Verify RLS is enabled on new tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS DISABLED - SECURITY RISK!'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('message_reactions', 'message_deletions', 'conversation_settings', 'blocks', 'message_reads')
ORDER BY tablename;

-- Expected: All rows show rls_enabled = true
-- If any show false: CRITICAL SECURITY ISSUE - RLS must be enabled


-- 6. Verify conversation cache columns
SELECT
  column_name,
  data_type,
  '✅ Column exists' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND column_name IN ('last_message_id', 'last_message_at', 'last_message_preview', 'last_sender_id')
ORDER BY column_name;

-- Expected: 4 rows (all cache columns)
-- If less than 4: Conversation caching incomplete


-- 7. Verify presence tracking
SELECT
  column_name,
  data_type,
  '✅ Column exists' as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'conversation_members'
  AND column_name = 'last_seen_at';

-- Expected: 1 row
-- If empty: Presence tracking not added


-- 8. Check for is_blocked helper function
SELECT
  routine_name,
  routine_type,
  '✅ Helper exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'is_blocked';

-- Expected: 1 row
-- If empty: Block helper function missing


-- 9. Verify key RLS policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  '✅ Policy exists' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('chat_messages', 'conversation_members', 'message_reactions', 'blocks')
  AND policyname IN (
    'Members can read chat messages',
    'Members can send chat messages',
    'Members can view conversation members',
    'Users can react in conversations',
    'Users can create blocks'
  )
ORDER BY tablename, policyname;

-- Expected: 5 rows (core policies)
-- If less than 5: Some RLS policies missing


-- 10. Test get_conversations_overview RPC (safe read-only test)
-- This will return your actual conversations (empty if you have none)
-- If this errors, the migration failed
SELECT
  id,
  type,
  (members::jsonb)->0->>'user_id' as first_member,
  pinned,
  unread_count,
  '✅ RPC working' as status
FROM public.get_conversations_overview()
LIMIT 5;

-- Expected: Your conversations (or 0 rows if none exist yet)
-- If ERROR: Migration failed or RPC has issues
-- Common error: "function does not exist" means migration NOT applied


-- ============================================================
-- SUMMARY CHECK
-- ============================================================
-- Run this to get a quick pass/fail summary:

WITH checks AS (
  SELECT
    'Migration Applied' as check_name,
    EXISTS(SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20260105120000') as passed
  UNION ALL
  SELECT
    'RPC Function Exists',
    EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_conversations_overview' AND routine_schema = 'public')
  UNION ALL
  SELECT
    'Chat Messages Columns',
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'chat_messages'
     AND column_name IN ('client_generated_id', 'reply_to_id', 'metadata', 'attachments', 'deleted_at')) >= 5
  UNION ALL
  SELECT
    'New Tables Exist',
    (SELECT COUNT(*) FROM information_schema.tables
     WHERE table_schema = 'public'
     AND table_name IN ('message_reactions', 'message_deletions', 'conversation_settings', 'blocks')) = 4
  UNION ALL
  SELECT
    'RLS Enabled',
    (SELECT COUNT(*) FROM pg_tables
     WHERE schemaname = 'public'
     AND tablename IN ('message_reactions', 'message_deletions', 'conversation_settings', 'blocks')
     AND rowsecurity = true) = 4
)
SELECT
  check_name,
  CASE
    WHEN passed THEN '✅ PASS'
    ELSE '❌ FAIL'
  END as result
FROM checks;

-- Expected: All checks show '✅ PASS'
-- If any show '❌ FAIL': Migration incomplete, check individual queries above
