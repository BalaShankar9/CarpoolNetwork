# Production Database Fix Guide

## Overview

The following schema errors are occurring in production:
1. `Could not find table public.recurring_ride_patterns in schema cache` - PostRide fails
2. `Could not find table public.profile_public_v in schema cache` - Active ride click fails
3. `get_conversations_overview` RPC missing - Messaging broken

## Quick Fix Steps

### Step 1: Connect to Supabase SQL Editor

1. Go to your Supabase Dashboard → SQL Editor
2. Create a new query

### Step 2: Run Verification Script First

```sql
-- Run this to see what's missing
DO $$
DECLARE
  missing text := '';
BEGIN
  -- Check recurring_ride_patterns
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recurring_ride_patterns') THEN
    missing := missing || '❌ recurring_ride_patterns table' || E'\n';
  ELSE
    RAISE NOTICE '✅ recurring_ride_patterns exists';
  END IF;
  
  -- Check profile_public_v
  IF NOT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'profile_public_v') THEN
    missing := missing || '❌ profile_public_v view' || E'\n';
  ELSE
    RAISE NOTICE '✅ profile_public_v exists';
  END IF;
  
  -- Check get_conversations_overview
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_conversations_overview') THEN
    missing := missing || '❌ get_conversations_overview function' || E'\n';
  ELSE
    RAISE NOTICE '✅ get_conversations_overview exists';
  END IF;
  
  IF missing <> '' THEN
    RAISE WARNING 'MISSING OBJECTS:%', E'\n' || missing;
  ELSE
    RAISE NOTICE '✅ All required objects exist!';
  END IF;
END $$;
```

### Step 3: Apply Missing Migrations

Run the following SQL statements in order. **Only run what's missing.**

#### 3a. Create profile_public_v View (if missing)

```sql
-- profile_public_v view
DROP VIEW IF EXISTS public.profile_public_v;

CREATE VIEW public.profile_public_v AS
SELECT
  id,
  full_name,
  avatar_url,
  profile_photo_url,
  created_at,
  country_of_residence,
  country,
  city,
  bio,
  languages,
  phone_verified,
  email_verified,
  photo_verified,
  id_verified,
  profile_verified,
  preferred_contact_method,
  allow_inhouse_chat,
  allow_whatsapp_chat,
  trust_score,
  average_rating,
  reliability_score,
  total_rides_offered,
  total_rides_taken,
  total_bookings,
  cancelled_bookings,
  last_minute_cancellations,
  phone_visibility,
  whatsapp_visibility,
  gender,
  date_of_birth,
  nationality,
  occupation,
  smoking_policy,
  pets_allowed,
  music_preference,
  conversation_level,
  luggage_size
FROM public.profiles;

GRANT SELECT ON public.profile_public_v TO anon, authenticated;
```

#### 3b. Create recurring_ride_patterns Table (if missing)

```sql
-- recurring_ride_patterns table
CREATE TABLE IF NOT EXISTS recurring_ride_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  origin TEXT NOT NULL,
  origin_lat DECIMAL(10, 8),
  origin_lng DECIMAL(11, 8),
  destination TEXT NOT NULL,
  destination_lat DECIMAL(10, 8),
  destination_lng DECIMAL(11, 8),
  departure_time TIME NOT NULL,
  available_seats INTEGER NOT NULL,
  notes TEXT,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('daily', 'weekly', 'monthly')),
  days_of_week INTEGER[],
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  occurrences_created INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_patterns_driver ON recurring_ride_patterns(driver_id);
CREATE INDEX IF NOT EXISTS idx_recurring_patterns_active ON recurring_ride_patterns(is_active) WHERE is_active = true;

-- Add column to rides table
ALTER TABLE rides ADD COLUMN IF NOT EXISTS recurring_pattern_id UUID REFERENCES recurring_ride_patterns(id) ON DELETE SET NULL;
ALTER TABLE rides ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT false;

-- RLS
ALTER TABLE recurring_ride_patterns ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Drivers can view own patterns" ON recurring_ride_patterns;
CREATE POLICY "Drivers can view own patterns" ON recurring_ride_patterns
  FOR SELECT USING (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can create own patterns" ON recurring_ride_patterns;
CREATE POLICY "Drivers can create own patterns" ON recurring_ride_patterns
  FOR INSERT WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "Drivers can update own patterns" ON recurring_ride_patterns;
CREATE POLICY "Drivers can update own patterns" ON recurring_ride_patterns
  FOR UPDATE USING (driver_id = auth.uid());
```

#### 3c. Create get_conversations_overview RPC (if missing)

```sql
-- get_conversations_overview RPC function
CREATE OR REPLACE FUNCTION public.get_conversations_overview()
RETURNS TABLE (
  id uuid,
  type text,
  ride_id uuid,
  trip_request_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender_id uuid,
  pinned boolean,
  muted boolean,
  archived boolean,
  unread_count bigint,
  members jsonb,
  other_user_id uuid,
  other_user_name text,
  other_user_avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.type,
    c.ride_id,
    c.trip_request_id,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    c.last_message_preview,
    c.last_sender_id,
    COALESCE(cs.pinned, false) AS pinned,
    COALESCE(cs.muted, false) AS muted,
    COALESCE(cs.archived, false) AS archived,
    COALESCE(unread.unread_count, 0) AS unread_count,
    jsonb_agg(
      jsonb_build_object(
        'user_id', cm.user_id,
        'role', cm.role,
        'last_seen_at', cm.last_seen_at,
        'profile', jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name,
          'avatar_url', COALESCE(p.profile_photo_url, p.avatar_url)
        )
      )
    ) AS members,
    (
      SELECT cm2.user_id 
      FROM conversation_members cm2 
      WHERE cm2.conversation_id = c.id AND cm2.user_id != auth.uid() 
      LIMIT 1
    ) AS other_user_id,
    (
      SELECT p2.full_name 
      FROM conversation_members cm2 
      JOIN profiles p2 ON p2.id = cm2.user_id 
      WHERE cm2.conversation_id = c.id AND cm2.user_id != auth.uid() 
      LIMIT 1
    ) AS other_user_name,
    (
      SELECT COALESCE(p2.profile_photo_url, p2.avatar_url) 
      FROM conversation_members cm2 
      JOIN profiles p2 ON p2.id = cm2.user_id 
      WHERE cm2.conversation_id = c.id AND cm2.user_id != auth.uid() 
      LIMIT 1
    ) AS other_user_avatar_url
  FROM conversations c
  INNER JOIN conversation_members cm ON cm.conversation_id = c.id
  INNER JOIN profiles p ON p.id = cm.user_id
  LEFT JOIN conversation_settings cs ON cs.conversation_id = c.id AND cs.user_id = auth.uid()
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS unread_count
    FROM chat_messages msg
    LEFT JOIN message_reads mr ON mr.conversation_id = c.id AND mr.user_id = auth.uid()
    WHERE msg.conversation_id = c.id
      AND msg.sender_id != auth.uid()
      AND msg.deleted_at IS NULL
      AND (mr.last_read_at IS NULL OR msg.created_at > mr.last_read_at)
  ) unread ON true
  WHERE EXISTS (
    SELECT 1 FROM conversation_members cm_auth
    WHERE cm_auth.conversation_id = c.id AND cm_auth.user_id = auth.uid()
  )
  GROUP BY c.id, c.type, c.ride_id, c.trip_request_id, c.created_at, c.updated_at,
           c.last_message_at, c.last_message_preview, c.last_sender_id,
           cs.pinned, cs.muted, cs.archived, unread.unread_count
  ORDER BY c.last_message_at DESC NULLS LAST;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_conversations_overview() TO authenticated;
```

### Step 4: Reload PostgREST Schema Cache

After applying migrations, run:

```sql
NOTIFY pgrst, 'reload schema';
```

This forces PostgREST to reload the schema cache immediately.

### Step 5: Verify Fix

Run the verification script from Step 2 again to confirm all objects exist.

## Alternative: Use Supabase CLI

If you have the Supabase CLI configured:

```bash
# From project root
npx supabase db push

# Or apply specific migrations
npx supabase migration up --target-version 20260108100000_fix_profile_public_view
npx supabase migration up --target-version 20260109120000_phase2_rbac_achievements_subscriptions
npx supabase migration up --target-version 20260106120000_fix_messaging_overview_rpc
```

## Troubleshooting

### Still seeing schema cache errors?

1. Wait 1-2 minutes for PostgREST to restart
2. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)
3. Clear browser cache and cookies for your app domain
4. Check Supabase logs for any errors

### conversation_settings table missing?

```sql
CREATE TABLE IF NOT EXISTS public.conversation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false,
  muted boolean DEFAULT false,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings" ON conversation_settings
  FOR SELECT USING (user_id = auth.uid());
  
CREATE POLICY "Users can update own settings" ON conversation_settings
  FOR ALL USING (user_id = auth.uid());
```

### Still having issues?

Contact the development team with:
1. The exact error message
2. The page/action where the error occurs
3. Output of the verification script
