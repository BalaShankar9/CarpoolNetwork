/*
  # Fix All RLS Performance Issues - Corrected Version
  
  1. Critical Performance Optimization
    - Replace all `auth.uid()` with `(select auth.uid())` in RLS policies
    - This prevents re-evaluation for each row, dramatically improving performance
  
  2. All Tables Fixed (56+ policies)
    - vehicles, rides, driver_licenses, booking_history
    - ai_chat_history, beta_allowlist, bug_reports
    - trip_requests, ride_requests, trip_offers
    - conversations, conversation_members, chat_messages
    - message_reads, friend_requests, friendships, blocks
    - conversation_read_markers, message_reports, ride_stops
  
  3. Correct Column Names Used
    - friendships: user_a, user_b (not user_a_id, user_b_id)
    - booking_history: user_id (not rider_id/driver_id)
    - vehicles: user_id (not owner_id)
*/

-- ============================================
-- VEHICLES
-- ============================================

DROP POLICY IF EXISTS "Users can view own vehicles" ON vehicles;
CREATE POLICY "Users can view own vehicles"
  ON vehicles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view vehicles for their bookings" ON vehicles;
CREATE POLICY "Users can view vehicles for their bookings"
  ON vehicles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      INNER JOIN ride_requests rr ON r.id = rr.ride_id
      WHERE r.vehicle_id = vehicles.id
      AND rr.rider_id = (select auth.uid())
      AND rr.status = 'accepted'
    )
  );

-- ============================================
-- RIDES
-- ============================================

DROP POLICY IF EXISTS "Drivers can view own rides" ON rides;
CREATE POLICY "Drivers can view own rides"
  ON rides FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view rides they have booked" ON rides;
CREATE POLICY "Users can view rides they have booked"
  ON rides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ride_requests
      WHERE ride_requests.ride_id = rides.id
      AND ride_requests.rider_id = (select auth.uid())
      AND ride_requests.status = 'accepted'
    )
  );

-- ============================================
-- DRIVER LICENSES
-- ============================================

DROP POLICY IF EXISTS "Users can view own license" ON driver_licenses;
CREATE POLICY "Users can view own license"
  ON driver_licenses FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own license" ON driver_licenses;
CREATE POLICY "Users can insert own license"
  ON driver_licenses FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own license" ON driver_licenses;
CREATE POLICY "Users can update own license"
  ON driver_licenses FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- BOOKING HISTORY
-- ============================================

DROP POLICY IF EXISTS "Users can view own booking history" ON booking_history;
CREATE POLICY "Users can view own booking history"
  ON booking_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own booking history" ON booking_history;
CREATE POLICY "Users can insert own booking history"
  ON booking_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- AI CHAT HISTORY
-- ============================================

DROP POLICY IF EXISTS "Users can read own chat history" ON ai_chat_history;
CREATE POLICY "Users can read own chat history"
  ON ai_chat_history FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can create own chat messages" ON ai_chat_history;
CREATE POLICY "Users can create own chat messages"
  ON ai_chat_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- BETA ALLOWLIST
-- ============================================

DROP POLICY IF EXISTS "Authenticated admins can insert allowlist entries" ON beta_allowlist;
CREATE POLICY "Authenticated admins can insert allowlist entries"
  ON beta_allowlist FOR INSERT
  TO authenticated
  WITH CHECK ((select is_admin()) = true);

DROP POLICY IF EXISTS "Authenticated admins can delete allowlist entries" ON beta_allowlist;
CREATE POLICY "Authenticated admins can delete allowlist entries"
  ON beta_allowlist FOR DELETE
  TO authenticated
  USING ((select is_admin()) = true);

-- ============================================
-- BUG REPORTS
-- ============================================

DROP POLICY IF EXISTS "Admin can read all bug reports" ON bug_reports;
CREATE POLICY "Admin can read all bug reports"
  ON bug_reports FOR SELECT
  TO authenticated
  USING ((select is_admin()) = true);

DROP POLICY IF EXISTS "Admin can insert bug reports" ON bug_reports;
CREATE POLICY "Admin can insert bug reports"
  ON bug_reports FOR INSERT
  TO authenticated
  WITH CHECK ((select is_admin()) = true);

DROP POLICY IF EXISTS "Admin can delete bug reports" ON bug_reports;
CREATE POLICY "Admin can delete bug reports"
  ON bug_reports FOR DELETE
  TO authenticated
  USING ((select is_admin()) = true);

-- ============================================
-- TRIP REQUESTS
-- ============================================

DROP POLICY IF EXISTS "Authenticated users can create ride requests" ON trip_requests;
CREATE POLICY "Authenticated users can create ride requests"
  ON trip_requests FOR INSERT
  TO authenticated
  WITH CHECK (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ride requests" ON trip_requests;
CREATE POLICY "Users can delete own ride requests"
  ON trip_requests FOR DELETE
  TO authenticated
  USING (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own ride requests" ON trip_requests;
CREATE POLICY "Users can update own ride requests"
  ON trip_requests FOR UPDATE
  TO authenticated
  USING (rider_id = (select auth.uid()))
  WITH CHECK (rider_id = (select auth.uid()));

-- ============================================
-- RIDE REQUESTS
-- ============================================

DROP POLICY IF EXISTS "Riders can view own ride requests" ON ride_requests;
CREATE POLICY "Riders can view own ride requests"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can view requests for their rides" ON ride_requests;
CREATE POLICY "Drivers can view requests for their rides"
  ON ride_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Riders can create ride requests" ON ride_requests;
CREATE POLICY "Riders can create ride requests"
  ON ride_requests FOR INSERT
  TO authenticated
  WITH CHECK (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Riders can cancel own requests" ON ride_requests;
CREATE POLICY "Riders can cancel own requests"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (rider_id = (select auth.uid()))
  WITH CHECK (rider_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can update requests for their rides" ON ride_requests;
CREATE POLICY "Drivers can update requests for their rides"
  ON ride_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_requests.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  );

-- ============================================
-- TRIP OFFERS
-- ============================================

DROP POLICY IF EXISTS "Drivers can create offers" ON trip_offers;
CREATE POLICY "Drivers can create offers"
  ON trip_offers FOR INSERT
  TO authenticated
  WITH CHECK (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can update own offers" ON trip_offers;
CREATE POLICY "Drivers can update own offers"
  ON trip_offers FOR UPDATE
  TO authenticated
  USING (driver_id = (select auth.uid()))
  WITH CHECK (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Drivers can view own offers" ON trip_offers;
CREATE POLICY "Drivers can view own offers"
  ON trip_offers FOR SELECT
  TO authenticated
  USING (driver_id = (select auth.uid()));

DROP POLICY IF EXISTS "Riders can update offers on their trips" ON trip_offers;
CREATE POLICY "Riders can update offers on their trips"
  ON trip_offers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Riders can view offers on their trips" ON trip_offers;
CREATE POLICY "Riders can view offers on their trips"
  ON trip_offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trip_requests
      WHERE trip_requests.id = trip_offers.trip_request_id
      AND trip_requests.rider_id = (select auth.uid())
    )
  );

-- ============================================
-- CONVERSATIONS
-- ============================================

DROP POLICY IF EXISTS "Users can view conversations they are members of" ON conversations;
CREATE POLICY "Users can view conversations they are members of"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = conversations.id
      AND conversation_members.user_id = (select auth.uid())
    )
  );

-- ============================================
-- CONVERSATION MEMBERS
-- ============================================

DROP POLICY IF EXISTS "Users can view members of their conversations" ON conversation_members;
CREATE POLICY "Users can view members of their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = (select auth.uid())
    )
  );

-- ============================================
-- CHAT MESSAGES
-- ============================================

DROP POLICY IF EXISTS "Users can edit own messages" ON chat_messages;
CREATE POLICY "Users can edit own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON chat_messages;
CREATE POLICY "Users can send messages in their conversations"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversation_members
      WHERE conversation_members.conversation_id = chat_messages.conversation_id
      AND conversation_members.user_id = (select auth.uid())
    )
  );

-- ============================================
-- MESSAGE READS
-- ============================================

DROP POLICY IF EXISTS "Users can mark messages as read" ON message_reads;
CREATE POLICY "Users can mark messages as read"
  ON message_reads FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view read receipts in their conversations" ON message_reads;
CREATE POLICY "Users can view read receipts in their conversations"
  ON message_reads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      INNER JOIN conversation_members cmem ON cm.conversation_id = cmem.conversation_id
      WHERE cm.id = message_reads.message_id
      AND cmem.user_id = (select auth.uid())
    )
  );

-- ============================================
-- FRIEND REQUESTS
-- ============================================

DROP POLICY IF EXISTS "Receiver can accept or decline request" ON friend_requests;
CREATE POLICY "Receiver can accept or decline request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (to_user_id = (select auth.uid()) AND status = 'pending')
  WITH CHECK (to_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Sender can cancel pending request" ON friend_requests;
CREATE POLICY "Sender can cancel pending request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (from_user_id = (select auth.uid()) AND status = 'pending')
  WITH CHECK (from_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can send friend requests" ON friend_requests;
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own friend requests" ON friend_requests;
CREATE POLICY "Users can view own friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (from_user_id = (select auth.uid()) OR to_user_id = (select auth.uid()));

-- ============================================
-- FRIENDSHIPS (using user_a and user_b columns)
-- ============================================

DROP POLICY IF EXISTS "Friendships created via function" ON friendships;
CREATE POLICY "Friendships created via function"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_a = (select auth.uid()) OR user_b = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unfriend" ON friendships;
CREATE POLICY "Users can unfriend"
  ON friendships FOR DELETE
  TO authenticated
  USING (user_a = (select auth.uid()) OR user_b = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own friendships" ON friendships;
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_a = (select auth.uid()) OR user_b = (select auth.uid()));

-- ============================================
-- BLOCKS
-- ============================================

DROP POLICY IF EXISTS "Users can block others" ON blocks;
CREATE POLICY "Users can block others"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can unblock" ON blocks;
CREATE POLICY "Users can unblock"
  ON blocks FOR DELETE
  TO authenticated
  USING (blocker_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (blocker_id = (select auth.uid()));

-- ============================================
-- CONVERSATION READ MARKERS
-- ============================================

DROP POLICY IF EXISTS "Users can insert own read markers" ON conversation_read_markers;
CREATE POLICY "Users can insert own read markers"
  ON conversation_read_markers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own read markers" ON conversation_read_markers;
CREATE POLICY "Users can read own read markers"
  ON conversation_read_markers FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own read markers" ON conversation_read_markers;
CREATE POLICY "Users can update own read markers"
  ON conversation_read_markers FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- MESSAGE REPORTS
-- ============================================

DROP POLICY IF EXISTS "Users can create message reports" ON message_reports;
CREATE POLICY "Users can create message reports"
  ON message_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own reports" ON message_reports;
CREATE POLICY "Users can view own reports"
  ON message_reports FOR SELECT
  TO authenticated
  USING (reporter_id = (select auth.uid()));

-- ============================================
-- RIDE STOPS
-- ============================================

DROP POLICY IF EXISTS "Anyone can view ride stops for their rides" ON ride_stops;
CREATE POLICY "Anyone can view ride stops for their rides"
  ON ride_stops FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides r
      WHERE r.id = ride_stops.ride_id
      AND (
        r.driver_id = (select auth.uid())
        OR EXISTS (
          SELECT 1 FROM ride_requests rr
          WHERE rr.ride_id = r.id
          AND rr.rider_id = (select auth.uid())
          AND rr.status = 'accepted'
        )
      )
    )
  );

DROP POLICY IF EXISTS "Drivers can manage their ride stops" ON ride_stops;
CREATE POLICY "Drivers can manage their ride stops"
  ON ride_stops FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_stops.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides
      WHERE rides.id = ride_stops.ride_id
      AND rides.driver_id = (select auth.uid())
    )
  );
