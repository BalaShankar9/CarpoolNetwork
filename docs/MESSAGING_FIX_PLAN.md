# Messaging Fix Plan

**Created:** 2026-01-15  
**Priority:** P0 (Production outage)

---

## Overview

This document outlines the step-by-step plan to restore and improve the messaging system.

---

## Phase P0: Restore Production Messaging (IMMEDIATE)

**Goal:** Get `/messages` working again within 30 minutes.

### Step 1: Apply Schema Hotfix Migration

**File:** `supabase/migrations/20260115200000_messaging_schema_hotfix.sql`

This migration:
- ✅ Adds `last_seen_at` column to `conversation_members`
- ✅ Adds `last_read_at` column to `conversation_members`
- ✅ Creates `conversation_settings` table if missing
- ✅ Ensures `message_reads` table has correct schema
- ✅ Creates/updates `get_conversations_overview` RPC with COALESCE defaults
- ✅ Creates `mark_conversation_read` RPC (both overloads)
- ✅ Creates `check_messaging_schema` diagnostic RPC
- ✅ Adds all necessary indexes
- ✅ Enables realtime for messaging tables

**How to apply:**
```bash
# Option 1: Via Supabase CLI
supabase db push

# Option 2: Via Supabase Dashboard
# 1. Go to SQL Editor
# 2. Paste contents of 20260115200000_messaging_schema_hotfix.sql
# 3. Run
```

### Step 2: Reload Schema Cache

**CRITICAL:** After applying the migration, you MUST reload the PostgREST schema cache:

1. Go to Supabase Dashboard
2. Navigate to **Settings** → **API**
3. Click **"Reload schema cache"**
4. Wait 30 seconds

### Step 3: Verify in Production

```sql
-- Run this in Supabase SQL Editor
SELECT * FROM check_messaging_schema();
```

Expected output:
```json
{
  "conversation_members_last_seen_at": true,
  "conversation_settings_table": true,
  "message_reads_table": true,
  "conversations_last_message_at": true,
  "schema_healthy": true,
  "checked_at": "2026-01-15T..."
}
```

### Step 4: Test User Flow

1. Go to https://carpoolnetwork.co.uk/messages
2. Verify conversations load
3. Open a conversation
4. Send a test message
5. Verify no errors in browser console

---

## Phase P1: Frontend Resilience (COMPLETED)

**Goal:** Ensure messaging never crashes due to schema issues again.

### Changes Made

#### 1. Safe RPC Utilities (`src/services/messagingUtils.ts`)

- `safeRpc()` - Typed RPC calls with error classification
- `safeRpcWithRetry()` - Automatic retry for transient errors
- `safeRealtimeSubscribe()` - Resilient realtime with reconnection
- `updatePresenceBestEffort()` - Non-blocking, debounced presence
- `markReadDebounced()` - Debounced read receipts
- `runMessagingDiagnostics()` - Runtime schema/connection checks

#### 2. NewChatSystem Improvements

- Uses `safeRpcWithRetry` instead of raw `supabase.rpc()`
- Presence updates are now best-effort (don't block UI)
- Read receipts are debounced (reduce database load)
- Added diagnostics panel in error UI
- Better error classification (schema vs network)

#### 3. Error UI Enhancements

- Clear messaging about what's wrong
- "Run Diagnostics" button for troubleshooting
- Shows exactly which schema objects are missing
- Provides admin action instructions

---

## Phase P2: Unified Messaging (FUTURE)

**Goal:** Standardize all chat surfaces in the app.

### Current Chat Implementations

| Surface | File | Status |
|---------|------|--------|
| Direct Messages | `NewChatSystem.tsx` | ✅ Fixed |
| Community Chat | `CommunityChat.tsx` | ✅ Separate table, unaffected |
| Pool Chat | `PoolChat.tsx` | ✅ Separate table, unaffected |

### Recommended Improvements

1. **Extract shared components:**
   - `MessageBubble` - Consistent message rendering
   - `ConversationHeader` - Consistent header with actions
   - `MessageComposer` - Consistent input with attachments

2. **Use shared utilities:**
   - Import `safeRpc` in all chat components
   - Use `safeRealtimeSubscribe` for all realtime

3. **Standardize empty states:**
   - Same design language across all chat surfaces
   - Consistent "no messages" illustrations

---

## Rollout Checklist

### P0 (Immediate - 30 min)

- [ ] Apply migration to production
- [ ] Reload schema cache
- [ ] Verify via `check_messaging_schema()`
- [ ] Test `/messages` page loads
- [ ] Test sending a message
- [ ] Monitor for errors (5 min)

### P1 (Frontend - Already deployed)

- [ ] Verify new error handling works
- [ ] Verify diagnostics panel shows in errors
- [ ] Verify presence updates don't block
- [ ] Run unit tests: `npm run test -- messaging`

### P2 (Future sprint)

- [ ] Audit CommunityChat.tsx for same patterns
- [ ] Audit PoolChat.tsx for same patterns
- [ ] Extract shared components
- [ ] Create unified message types

---

## Rollback Plan

If the migration causes issues:

```sql
-- Rollback: Remove new columns (if needed)
ALTER TABLE conversation_members DROP COLUMN IF EXISTS last_seen_at;
ALTER TABLE conversation_members DROP COLUMN IF EXISTS last_read_at;

-- Note: Do NOT drop conversation_settings or message_reads if they have data
```

**Better approach:** The frontend now has fallback queries that work without the new columns. If the RPC fails, it automatically falls back to basic queries.

---

## Monitoring

After deployment, watch for:

1. **Sentry/error tracking:**
   - Errors containing "PGRST202"
   - Errors containing "column does not exist"
   - Errors containing "function does not exist"

2. **Supabase dashboard:**
   - `get_conversations_overview` call count
   - `mark_conversation_read` call count
   - Any 500 errors on messaging endpoints

3. **User feedback:**
   - "Messages not loading" reports
   - "Can't send message" reports

---

## Success Criteria

✅ P0 is complete when:
- `/messages` page loads for all users
- Users can send and receive messages
- No "Messaging Unavailable" errors
- Console shows no schema-related errors

✅ P1 is complete when:
- Presence updates never block the UI
- Read receipts are debounced
- Diagnostics panel works in error state
- Unit tests pass

---

**Document Owner:** Engineering Team  
**Last Updated:** 2026-01-15
