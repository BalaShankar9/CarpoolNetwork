# Apply Messaging System Upgrade Migration

## Problem
The frontend code expects an upgraded messaging schema (conversations overview RPC, enhanced chat_messages columns, reactions, etc.) but the database migration has not been applied yet.

## Symptoms
- Red toast: "Unable to load conversations."
- Red toast: "Unable to load messages."
- Console errors: `function public.get_conversations_overview() does not exist`
- Console errors: column `chat_messages.client_generated_id` does not exist

## Solution: Apply Migration `20260105120000_upgrade_messaging_system.sql`

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/project/uqofmsreosfjflmgurzb
   - Go to **SQL Editor** (left sidebar)

2. **Check Current Migration Status**
   ```sql
   SELECT version, name
   FROM supabase_migrations.schema_migrations
   WHERE version >= '20251215000000'
   ORDER BY version DESC
   LIMIT 20;
   ```

   **Expected Result**: You should NOT see `20260105120000` in the list. If you do see it, the migration is already applied and the issue is elsewhere (contact support).

3. **Apply the Migration**
   - Click **+ New Query**
   - Open the file: `supabase/migrations/20260105120000_upgrade_messaging_system.sql`
   - Copy the ENTIRE contents (all 799 lines)
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd/Ctrl + Enter)

4. **Verify Success**
   ```sql
   -- Check function exists
   SELECT routine_name, routine_type
   FROM information_schema.routines
   WHERE routine_name = 'get_conversations_overview'
   AND routine_schema = 'public';

   -- Should return 1 row: get_conversations_overview | FUNCTION

   -- Check new columns exist
   SELECT column_name
   FROM information_schema.columns
   WHERE table_name = 'chat_messages'
   AND column_name IN ('client_generated_id', 'reply_to_id', 'metadata', 'attachments', 'deleted_at');

   -- Should return 5 rows

   -- Check new tables exist
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('message_reactions', 'message_deletions', 'conversation_settings', 'blocks');

   -- Should return 4 rows
   ```

5. **Test the Application**
   - Navigate to https://carpoolnetwork.co.uk/messages
   - You should see either:
     - ✅ Your conversation list (if you have conversations)
     - ✅ "No conversations yet" (if truly empty, no error)
   - NO red toasts should appear

### Option B: Supabase CLI (If Configured)

```bash
# Ensure you're logged in
supabase login

# Link to your project (if not already)
supabase link --project-ref uqofmsreosfjflmgurzb

# Push pending migrations
supabase db push

# Verify
supabase db diff
```

### Option C: Manual SQL Execution (Last Resort)

If you need to run individual statements:

```sql
-- 1. Add conversation cache fields
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_id uuid,
  ADD COLUMN IF NOT EXISTS last_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_message_preview text,
  ADD COLUMN IF NOT EXISTS last_sender_id uuid;

-- 2. Add presence tracking
ALTER TABLE public.conversation_members
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- 3. Create blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- Continue with remaining statements from the migration file...
-- (See full file for complete migration)
```

⚠️ **IMPORTANT**: It's STRONGLY recommended to run the complete migration file (Option A or B) rather than individual statements to avoid missing dependencies.

## Post-Migration Checklist

- [ ] Migration `20260105120000` appears in `supabase_migrations.schema_migrations`
- [ ] Function `get_conversations_overview()` exists
- [ ] Table `message_reactions` exists
- [ ] Table `blocks` exists
- [ ] Column `chat_messages.client_generated_id` exists
- [ ] `/messages` page loads without red toasts
- [ ] Can select a conversation and view messages
- [ ] Can send a new message

## Rollback (Emergency Only)

If the migration causes issues, you can rollback by restoring from a backup:

1. Go to **Database** → **Backups** in Supabase Dashboard
2. Select the most recent backup BEFORE the migration
3. Click **Restore**

⚠️ This will lose any data created after the backup.

## Security Notes

The migration includes:

- ✅ Strict RLS policies (users can only access conversations they're members of)
- ✅ Block checks (users cannot message blocked contacts)
- ✅ SECURITY DEFINER functions with `SET search_path = public` for safety
- ✅ Realtime enabled on new tables
- ✅ Proper foreign key constraints and indexes

All policies enforce `auth.uid()` checks to prevent data leaks.

## Support

If you encounter errors during migration:

1. Copy the EXACT error message from the SQL Editor
2. Check the Dev Console for `[DEV]` logs showing the specific failing query
3. Verify your Supabase project has sufficient permissions
4. Contact Supabase support with the error details

---

**Migration File**: `supabase/migrations/20260105120000_upgrade_messaging_system.sql`
**Date**: January 5, 2026
**Purpose**: Upgrade messaging system with reactions, blocks, enhanced read states, and conversation caching
