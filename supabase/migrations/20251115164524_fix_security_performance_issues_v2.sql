/*
  # Fix Security and Performance Issues

  ## 1. Add Missing Indexes on Foreign Keys
    - Add index on emergency_contacts.user_id
    - Add index on reviews.reviewer_id
    - Add index on ride_waitlist.user_id
    - Add index on rides.vehicle_id
    - Add index on safety_reports.reporter_id
    - Add index on safety_reports.ride_id

  ## 2. Remove Unused Indexes
    - Drop unused indexes that are not being utilized

  ## 3. Optimize RLS Policies
    - Replace auth.uid() with (SELECT auth.uid()) in all RLS policies
    - This prevents re-evaluation for each row, improving performance

  ## 4. Fix Function Search Path
    - Set search_path for update_updated_at_column function
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id 
ON emergency_contacts(user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id 
ON reviews(reviewer_id);

CREATE INDEX IF NOT EXISTS idx_ride_waitlist_user_id_fk 
ON ride_waitlist(user_id);

CREATE INDEX IF NOT EXISTS idx_rides_vehicle_id 
ON rides(vehicle_id);

CREATE INDEX IF NOT EXISTS idx_safety_reports_reporter_id 
ON safety_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_safety_reports_ride_id_fk 
ON safety_reports(ride_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_vehicles_is_active;
DROP INDEX IF EXISTS idx_rides_location;
DROP INDEX IF EXISTS idx_ride_bookings_ride_id;
DROP INDEX IF EXISTS idx_ride_bookings_status;
DROP INDEX IF EXISTS idx_messages_ride_id;
DROP INDEX IF EXISTS idx_messages_created_at;
DROP INDEX IF EXISTS idx_reviews_reviewee_id;
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_is_read;
DROP INDEX IF EXISTS idx_safety_reports_reported_user_id;
DROP INDEX IF EXISTS idx_saved_locations_user_id;

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - PROFILES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - USER_PREFERENCES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - EMERGENCY_CONTACTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON emergency_contacts;

CREATE POLICY "Users can manage own emergency contacts"
ON emergency_contacts
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - VEHICLES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON vehicles;

CREATE POLICY "Users can view own vehicles"
ON vehicles FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own vehicles"
ON vehicles FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own vehicles"
ON vehicles FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own vehicles"
ON vehicles FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - SAFETY_REPORTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own reports" ON safety_reports;
DROP POLICY IF EXISTS "Users can create safety reports" ON safety_reports;

CREATE POLICY "Users can view own reports"
ON safety_reports FOR SELECT
TO authenticated
USING (reporter_id = (SELECT auth.uid()));

CREATE POLICY "Users can create safety reports"
ON safety_reports FOR INSERT
TO authenticated
WITH CHECK (reporter_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - RIDES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view active rides" ON rides;
DROP POLICY IF EXISTS "Users can insert own rides" ON rides;
DROP POLICY IF EXISTS "Drivers can update own rides" ON rides;
DROP POLICY IF EXISTS "Drivers can delete own rides" ON rides;

CREATE POLICY "Anyone can view active rides"
ON rides FOR SELECT
TO authenticated
USING (status = 'active');

CREATE POLICY "Users can insert own rides"
ON rides FOR INSERT
TO authenticated
WITH CHECK (driver_id = (SELECT auth.uid()));

CREATE POLICY "Drivers can update own rides"
ON rides FOR UPDATE
TO authenticated
USING (driver_id = (SELECT auth.uid()))
WITH CHECK (driver_id = (SELECT auth.uid()));

CREATE POLICY "Drivers can delete own rides"
ON rides FOR DELETE
TO authenticated
USING (driver_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - RIDE_BOOKINGS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own bookings or bookings for their rides" ON ride_bookings;
DROP POLICY IF EXISTS "Users can insert own bookings" ON ride_bookings;
DROP POLICY IF EXISTS "Users can update own bookings or driver can update bookings for" ON ride_bookings;

CREATE POLICY "Users can view own bookings or bookings for their rides"
ON ride_bookings FOR SELECT
TO authenticated
USING (
  passenger_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_bookings.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can insert own bookings"
ON ride_bookings FOR INSERT
TO authenticated
WITH CHECK (passenger_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own bookings or driver can update bookings for"
ON ride_bookings FOR UPDATE
TO authenticated
USING (
  passenger_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_bookings.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  passenger_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_bookings.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
);

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - NOTIFICATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - RIDE_WAITLIST TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view waitlists for rides they're involved in" ON ride_waitlist;
DROP POLICY IF EXISTS "Users can insert themselves to waitlist" ON ride_waitlist;
DROP POLICY IF EXISTS "Users can remove themselves from waitlist" ON ride_waitlist;

CREATE POLICY "Users can view waitlists for rides they're involved in"
ON ride_waitlist FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid()) OR
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.id = ride_waitlist.ride_id
    AND rides.driver_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can insert themselves to waitlist"
ON ride_waitlist FOR INSERT
TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove themselves from waitlist"
ON ride_waitlist FOR DELETE
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - MESSAGES TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view their messages" ON messages;
DROP POLICY IF EXISTS "Users can send messages" ON messages;
DROP POLICY IF EXISTS "Recipients can update message read status" ON messages;

CREATE POLICY "Users can view their messages"
ON messages FOR SELECT
TO authenticated
USING (
  sender_id = (SELECT auth.uid()) OR
  recipient_id = (SELECT auth.uid())
);

CREATE POLICY "Users can send messages"
ON messages FOR INSERT
TO authenticated
WITH CHECK (sender_id = (SELECT auth.uid()));

CREATE POLICY "Recipients can update message read status"
ON messages FOR UPDATE
TO authenticated
USING (recipient_id = (SELECT auth.uid()))
WITH CHECK (recipient_id = (SELECT auth.uid()));

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - REVIEWS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can create reviews for rides they participated in" ON reviews;

CREATE POLICY "Users can create reviews for rides they participated in"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_id = (SELECT auth.uid()) AND
  EXISTS (
    SELECT 1 FROM ride_bookings
    WHERE ride_bookings.ride_id = reviews.ride_id
    AND ride_bookings.passenger_id = (SELECT auth.uid())
    AND ride_bookings.status = 'completed'
  )
);

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - SAVED_LOCATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own saved locations" ON saved_locations;

CREATE POLICY "Users can manage own saved locations"
ON saved_locations
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATH
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    ALTER FUNCTION update_updated_at_column() SET search_path = '';
  END IF;
END $$;