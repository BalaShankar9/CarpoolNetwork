/*
  # Complete System Fixes Migration

  This migration addresses all remaining issues:
  1. conversation_settings table (for pinned/muted/archived)
  2. is_blocked() helper function
  3. help_articles table for chatbot hub
  4. Additional friends system improvements
  5. Ensure all RPCs have proper permissions
*/

-- ============================================================================
-- 1. CONVERSATION SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.conversation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pinned boolean DEFAULT false,
  muted boolean DEFAULT false,
  archived boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_settings_user_id
  ON public.conversation_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_settings_conversation_id
  ON public.conversation_settings(conversation_id);

ALTER TABLE public.conversation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversation settings" ON public.conversation_settings;
CREATE POLICY "Users can view own conversation settings"
  ON public.conversation_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own conversation settings" ON public.conversation_settings;
CREATE POLICY "Users can insert own conversation settings"
  ON public.conversation_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own conversation settings" ON public.conversation_settings;
CREATE POLICY "Users can update own conversation settings"
  ON public.conversation_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 2. IS_BLOCKED HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_blocked(p_user_a uuid, p_user_b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocks
    WHERE (blocker_id = p_user_a AND blocked_id = p_user_b)
       OR (blocker_id = p_user_b AND blocked_id = p_user_a)
  );
$$;

REVOKE ALL ON FUNCTION public.is_blocked(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;

-- ============================================================================
-- 3. HELP ARTICLES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  summary text,
  content_md text NOT NULL,
  category text NOT NULL CHECK (category IN ('getting-started', 'rides', 'messaging', 'safety', 'account', 'faq')),
  tags text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_articles_tags ON public.help_articles USING gin(tags);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

-- Anyone can read published help articles
DROP POLICY IF EXISTS "Anyone can read published help articles" ON public.help_articles;
CREATE POLICY "Anyone can read published help articles"
  ON public.help_articles FOR SELECT
  USING (is_published = true);

-- Admins can manage help articles (using is_admin from profiles)
DROP POLICY IF EXISTS "Admins can manage help articles" ON public.help_articles;
CREATE POLICY "Admins can manage help articles"
  ON public.help_articles FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Insert default help articles
INSERT INTO public.help_articles (slug, title, summary, content_md, category, tags, sort_order) VALUES
('getting-started', 'Getting Started with Carpool Network', 'Learn how to set up your account and start using the app.',
'## Welcome to Carpool Network!

### Step 1: Complete Your Profile
Before you can post or request rides, you need to complete your profile:
- Add your full name
- Upload a profile photo
- Verify your phone number
- Set your country

### Step 2: Find or Post a Ride
- **Find a Ride**: Search for available rides matching your route
- **Post a Ride**: Share your journey and offer seats to others
- **Request a Ride**: Let drivers know you need a ride on a specific route

### Step 3: Connect Safely
- All users must verify their phone number
- Check driver/passenger ratings before booking
- Use in-app messaging for all communication
- Report any safety concerns immediately

Need more help? Contact support at support@carpoolnetwork.co.uk',
'getting-started', ARRAY['onboarding', 'signup', 'profile'], 1),

('how-to-post-ride', 'How to Post a Ride', 'Step-by-step guide to offering a ride.',
'## Posting a Ride

1. Tap **Post Ride** in the navigation
2. Enter your starting location and destination
3. Select date and time of departure
4. Set the number of available seats
5. Add any notes (luggage space, stops, etc.)
6. Submit your ride

Your ride will be visible to other users searching for similar routes.

### Tips for a Great Listing
- Be specific about pickup/drop-off points
- Mention if you have luggage space
- Set realistic departure times
- Respond quickly to booking requests',
'rides', ARRAY['post', 'offer', 'driver'], 2),

('how-to-request-ride', 'How to Request a Ride', 'Learn how to find and book a ride.',
'## Finding a Ride

1. Tap **Find Rides** in the navigation
2. Enter your pickup and drop-off locations
3. Select your travel date
4. Browse available rides
5. Tap on a ride to see details
6. Click **Request Seat** to send a booking request

### What Happens Next?
- The driver receives your request
- They can accept or decline
- Once accepted, you can message each other
- You''ll receive a notification when the driver responds',
'rides', ARRAY['find', 'search', 'book', 'passenger'], 3),

('messaging-guide', 'Using Messages', 'How to communicate with drivers and passengers.',
'## In-App Messaging

All ride-related communication happens through our secure messaging system.

### Starting a Conversation
- Conversations are automatically created when a booking is accepted
- You can also message friends directly

### Message Features
- Text messages
- Ride and booking cards
- Read receipts
- Typing indicators

### Safety Tips
- Keep all communication in the app
- Never share personal financial information
- Report suspicious messages immediately',
'messaging', ARRAY['chat', 'communication', 'messages'], 4),

('safety-tips', 'Safety Guidelines', 'Important safety information for all users.',
'## Your Safety Matters

### Before the Ride
- Verify the driver/passenger profile
- Check ratings and reviews
- Share ride details with a trusted contact
- Meet in well-lit public areas

### During the Ride
- Trust your instincts
- Keep your phone charged
- Share your live location with someone
- Use the SOS feature if needed

### After the Ride
- Leave an honest review
- Report any concerns immediately
- Block users if necessary

### Emergency Contact
In case of emergency, always call local emergency services first.',
'safety', ARRAY['safety', 'security', 'emergency', 'sos'], 5),

('account-settings', 'Account Settings', 'Manage your profile and privacy settings.',
'## Managing Your Account

### Profile Settings
- Update your name and bio
- Change your profile photo
- Add languages you speak
- Set your location

### Privacy Controls
- **Phone Visibility**: Who can see your phone number
- **WhatsApp Visibility**: Who can see your WhatsApp
- Control what information is shown on your public profile

### Security
- Change your password
- Enable two-factor authentication
- Review active sessions
- Download your data

### Deleting Your Account
Contact support to delete your account. Note that this action is irreversible.',
'account', ARRAY['settings', 'privacy', 'profile', 'security'], 6)

ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 4. FRIENDS SYSTEM IMPROVEMENTS
-- ============================================================================

-- Add unfriend function
CREATE OR REPLACE FUNCTION public.unfriend(p_friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.friendships
  WHERE (user_a = LEAST(v_user_id, p_friend_id) AND user_b = GREATEST(v_user_id, p_friend_id));

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.unfriend(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unfriend(uuid) TO authenticated;

-- Add block user function
CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_block_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_user_id = p_blocked_id THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;

  -- Remove any existing friendship
  DELETE FROM public.friendships
  WHERE (user_a = LEAST(v_user_id, p_blocked_id) AND user_b = GREATEST(v_user_id, p_blocked_id));

  -- Cancel any pending friend requests
  UPDATE public.friend_requests
  SET status = 'CANCELLED', updated_at = now()
  WHERE status = 'PENDING'
    AND ((from_user_id = v_user_id AND to_user_id = p_blocked_id)
      OR (from_user_id = p_blocked_id AND to_user_id = v_user_id));

  -- Create block
  INSERT INTO public.blocks (blocker_id, blocked_id)
  VALUES (v_user_id, p_blocked_id)
  ON CONFLICT (blocker_id, blocked_id) DO NOTHING
  RETURNING id INTO v_block_id;

  RETURN COALESCE(v_block_id, (SELECT id FROM public.blocks WHERE blocker_id = v_user_id AND blocked_id = p_blocked_id));
END;
$$;

REVOKE ALL ON FUNCTION public.block_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.block_user(uuid) TO authenticated;

-- Add unblock user function
CREATE OR REPLACE FUNCTION public.unblock_user(p_blocked_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM public.blocks
  WHERE blocker_id = v_user_id AND blocked_id = p_blocked_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.unblock_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unblock_user(uuid) TO authenticated;

-- Add get friends list function
CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (
  friendship_id uuid,
  friend_id uuid,
  full_name text,
  avatar_url text,
  profile_photo_url text,
  bio text,
  average_rating numeric,
  trust_score numeric,
  profile_verified boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    f.id AS friendship_id,
    CASE WHEN f.user_a = auth.uid() THEN f.user_b ELSE f.user_a END AS friend_id,
    p.full_name,
    p.avatar_url,
    p.profile_photo_url,
    p.bio,
    p.average_rating,
    p.trust_score,
    p.profile_verified,
    f.created_at
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE WHEN f.user_a = auth.uid() THEN f.user_b ELSE f.user_a END
  WHERE f.user_a = auth.uid() OR f.user_b = auth.uid()
  ORDER BY p.full_name;
$$;

REVOKE ALL ON FUNCTION public.get_friends() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_friends() TO authenticated;

-- ============================================================================
-- 5. RIDE REQUEST RPC (transactional seat booking)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.request_ride(
  p_ride_id uuid,
  p_seats integer DEFAULT 1,
  p_note text DEFAULT NULL,
  p_pickup_location text DEFAULT NULL,
  p_dropoff_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_booking_id uuid;
  v_ride record;
  v_driver_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check profile completeness
  IF NOT public.is_profile_complete(v_user_id) THEN
    RAISE EXCEPTION 'Please complete your profile before requesting a ride';
  END IF;

  -- Get ride details with lock
  SELECT id, driver_id, origin, destination, available_seats, status, departure_time
  INTO v_ride
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  v_driver_id := v_ride.driver_id;

  -- Validations
  IF v_driver_id = v_user_id THEN
    RAISE EXCEPTION 'Cannot request your own ride';
  END IF;

  IF v_ride.status != 'active' THEN
    RAISE EXCEPTION 'This ride is no longer available';
  END IF;

  IF v_ride.departure_time < now() THEN
    RAISE EXCEPTION 'This ride has already departed';
  END IF;

  IF v_ride.available_seats < p_seats THEN
    RAISE EXCEPTION 'Not enough seats available';
  END IF;

  -- Check for existing pending/confirmed booking
  IF EXISTS (
    SELECT 1 FROM public.ride_bookings
    WHERE ride_id = p_ride_id AND passenger_id = v_user_id
    AND status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'You already have a booking for this ride';
  END IF;

  -- Check if blocked
  IF public.is_blocked(v_user_id, v_driver_id) THEN
    RAISE EXCEPTION 'Unable to request this ride';
  END IF;

  -- Create booking
  INSERT INTO public.ride_bookings (
    ride_id,
    passenger_id,
    pickup_location,
    dropoff_location,
    seats_requested,
    status,
    notes
  ) VALUES (
    p_ride_id,
    v_user_id,
    COALESCE(p_pickup_location, v_ride.origin),
    COALESCE(p_dropoff_location, v_ride.destination),
    p_seats,
    'pending',
    p_note
  )
  RETURNING id INTO v_booking_id;

  -- Create notification for driver
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_driver_id,
    'booking',
    'New Booking Request',
    'Someone wants to join your ride!',
    jsonb_build_object(
      'booking_id', v_booking_id,
      'ride_id', p_ride_id,
      'passenger_id', v_user_id,
      'seats', p_seats
    )
  );

  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_ride(uuid, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_ride(uuid, integer, text, text, text) TO authenticated;

-- ============================================================================
-- 6. SEARCH HELP ARTICLES FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_help_articles(p_query text)
RETURNS TABLE (
  id uuid,
  slug text,
  title text,
  summary text,
  category text,
  relevance real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    h.id,
    h.slug,
    h.title,
    h.summary,
    h.category,
    ts_rank(
      setweight(to_tsvector('english', h.title), 'A') ||
      setweight(to_tsvector('english', COALESCE(h.summary, '')), 'B') ||
      setweight(to_tsvector('english', h.content_md), 'C'),
      plainto_tsquery('english', p_query)
    ) AS relevance
  FROM public.help_articles h
  WHERE h.is_published = true
    AND (
      h.title ILIKE '%' || p_query || '%'
      OR h.summary ILIKE '%' || p_query || '%'
      OR h.content_md ILIKE '%' || p_query || '%'
      OR EXISTS (SELECT 1 FROM unnest(h.tags) t WHERE t ILIKE '%' || p_query || '%')
    )
  ORDER BY relevance DESC, h.sort_order ASC
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.search_help_articles(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_help_articles(text) TO anon, authenticated;

-- ============================================================================
-- 7. REALTIME PUBLICATIONS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
  END IF;
END $$;

-- ============================================================================
-- 8. UPDATED_AT TRIGGER FOR NEW TABLES
-- ============================================================================

DROP TRIGGER IF EXISTS update_conversation_settings_updated_at ON public.conversation_settings;
CREATE TRIGGER update_conversation_settings_updated_at
  BEFORE UPDATE ON public.conversation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_help_articles_updated_at ON public.help_articles;
CREATE TRIGGER update_help_articles_updated_at
  BEFORE UPDATE ON public.help_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
