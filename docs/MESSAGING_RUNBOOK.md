# Messaging System Runbook

**Purpose:** Step-by-step instructions for operating and troubleshooting the messaging system.

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| Apply migration | `supabase db push` or SQL Editor |
| Reload schema cache | Supabase Dashboard → Settings → API → Reload |
| Check schema health | `SELECT * FROM check_messaging_schema();` |
| Run frontend diagnostics | Click "Run Diagnostics" in error UI |
| Test RPC | `SELECT * FROM get_conversations_overview();` |

---

## 1. Applying Migrations to Production

### Option A: Supabase CLI (Recommended)

```bash
# 1. Ensure you're logged in
supabase login

# 2. Link to your production project
supabase link --project-ref YOUR_PROJECT_REF

# 3. Push all pending migrations
supabase db push

# 4. Verify
supabase db diff
```

### Option B: Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor**
4. Click **New Query**
5. Paste the contents of the migration file:
   - `supabase/migrations/20260115200000_messaging_schema_hotfix.sql`
6. Click **Run**
7. Verify no errors in the output

### Option C: Direct psql (Advanced)

```bash
# Get connection string from Supabase Dashboard → Settings → Database
psql "postgresql://postgres:[password]@[host]:5432/postgres" \
  -f supabase/migrations/20260115200000_messaging_schema_hotfix.sql
```

---

## 2. Reloading Schema Cache

**IMPORTANT:** After any migration that adds/removes tables, columns, or functions, you MUST reload the PostgREST schema cache.

### Steps:

1. Go to Supabase Dashboard
2. Navigate to **Settings** (gear icon in sidebar)
3. Click **API** in the submenu
4. Scroll to **Schema Cache** section
5. Click **"Reload schema cache"** button
6. Wait 30 seconds before testing

### Why this matters:

PostgREST (Supabase's REST API layer) caches the database schema for performance. Without reloading:
- New functions return `PGRST202` (function not found)
- New columns return "column does not exist"
- New tables return `PGRST204` (table not found)

---

## 3. Verifying Messaging End-to-End

### Step 1: Check Schema Health

Run in SQL Editor:

```sql
SELECT * FROM check_messaging_schema();
```

**Expected output (healthy):**
```json
{
  "conversation_members_last_seen_at": true,
  "conversation_settings_table": true,
  "message_reads_table": true,
  "conversations_last_message_at": true,
  "schema_healthy": true,
  "checked_at": "2026-01-15T12:00:00Z"
}
```

**If `schema_healthy: false`:** Re-apply the migration.

### Step 2: Test RPC Function

Run in SQL Editor (as an authenticated user):

```sql
-- You need to be authenticated, so test via the app or:
SELECT * FROM get_conversations_overview() LIMIT 5;
```

**Expected:** Returns conversation data (or empty array if no conversations).

**If error:** Check the error message:
- `PGRST202` → Reload schema cache
- `42703` (column not found) → Re-apply migration
- `42883` (function not found) → Reload schema cache

### Step 3: Test in Browser

1. Open https://carpoolnetwork.co.uk/messages
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Refresh the page
5. Look for errors containing:
   - "PGRST202" → Schema cache issue
   - "column does not exist" → Migration issue
   - "Failed to fetch" → Network issue

### Step 4: Test Sending a Message

1. Open a conversation
2. Type a message and send
3. Verify:
   - Message appears immediately (optimistic update)
   - No error toast
   - Message shows checkmarks (sent status)

### Step 5: Test Presence (Optional)

1. Open the same conversation in two browsers
2. In browser A, scroll/interact with messages
3. In browser B, check if "Last active" timestamp updates
4. Note: Presence updates are debounced (5 second delay)

---

## 4. Troubleshooting

### Problem: "Messaging Unavailable" Error

**Symptoms:**
- `/messages` page shows error
- Console shows `PGRST202` or schema errors

**Solution:**
1. Run diagnostics in the UI (click "Run Diagnostics")
2. If schema unhealthy:
   - Apply migration `20260115200000_messaging_schema_hotfix.sql`
   - Reload schema cache
   - Refresh page

### Problem: Conversations Load but Empty

**Symptoms:**
- Page loads without error
- No conversations shown even though user has some

**Check:**
```sql
-- As the user, check if they have conversations
SELECT cm.conversation_id, c.type 
FROM conversation_members cm
JOIN conversations c ON c.id = cm.conversation_id
WHERE cm.user_id = 'USER_UUID_HERE';
```

**If results exist but UI empty:**
- Check RLS policies
- Check if `get_conversations_overview` returns data for this user

### Problem: Messages Won't Send

**Symptoms:**
- Message shows "sending" forever
- Or shows red X (failed)

**Check:**
1. Browser console for errors
2. Network tab for failed requests
3. Rate limiting (`checkRateLimit` in code)

**Common causes:**
- User not verified (email)
- RLS policy blocking insert
- Network issue

### Problem: Read Receipts Not Updating

**Symptoms:**
- Unread count doesn't decrease
- Blue checkmarks don't appear

**Check:**
```sql
SELECT * FROM message_reads 
WHERE conversation_id = 'CONV_ID' AND user_id = 'USER_ID';
```

**If no rows:** `mark_conversation_read` RPC isn't being called.
**If stale rows:** Read state is stuck.

---

## 5. Monitoring & Alerts

### Key Metrics to Watch

1. **Error rate on `/messages` page**
   - Alert if > 5% of page loads fail

2. **`get_conversations_overview` latency**
   - Normal: < 500ms
   - Alert if > 2s

3. **Realtime connection drops**
   - Monitor in Supabase Realtime dashboard

### Log Queries

```sql
-- Check for recent messaging errors (if you have logging)
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%get_conversations_overview%'
ORDER BY calls DESC
LIMIT 10;
```

---

## 6. Emergency Procedures

### Complete Messaging Outage

1. **Immediate:** Post status update to users
2. **Check:** Is Supabase having issues? (status.supabase.com)
3. **Check:** Run `SELECT * FROM check_messaging_schema();`
4. **If schema issue:** Apply migration, reload cache
5. **If Supabase issue:** Wait for their resolution
6. **Fallback:** Frontend automatically falls back to direct queries

### Rollback Frontend Changes

If new frontend code causes issues:

```bash
# Revert to previous deployment in Netlify
# 1. Go to Netlify dashboard
# 2. Select the site
# 3. Go to Deploys
# 4. Find previous working deploy
# 5. Click "Publish deploy"
```

### Rollback Database Changes

**Caution:** Only do this if you're certain and no data was written.

```sql
-- Remove new columns (loses any presence data)
ALTER TABLE conversation_members DROP COLUMN IF EXISTS last_seen_at;
ALTER TABLE conversation_members DROP COLUMN IF EXISTS last_read_at;

-- Don't forget to reload schema cache after!
```

---

## 7. Contacts

| Role | Contact |
|------|---------|
| On-call Engineer | [Your contact] |
| Database Admin | [DBA contact] |
| Supabase Support | support@supabase.io |
| Netlify Support | support@netlify.com |

---

## Appendix: SQL Reference

### Check Table Exists
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'conversation_settings'
);
```

### Check Column Exists
```sql
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' 
    AND table_name = 'conversation_members' 
    AND column_name = 'last_seen_at'
);
```

### Check Function Exists
```sql
SELECT EXISTS (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_conversations_overview'
);
```

### List All Messaging Tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'conversations', 'conversation_members', 'conversation_settings',
    'chat_messages', 'message_reads', 'message_reactions'
  );
```

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-15  
**Maintained By:** Engineering Team
