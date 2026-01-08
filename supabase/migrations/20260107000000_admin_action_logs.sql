-- ============================================================================
-- MIGRATION: Admin Action Logs for Complete Admin Control
-- Created: 2026-01-07
-- Purpose: Track all admin actions on rides, bookings, and users
-- ============================================================================

-- Create admin action logs table
CREATE TABLE IF NOT EXISTS admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'ride_edit', 'ride_cancel', 'ride_delete', 'booking_approve', etc.
  resource_type TEXT NOT NULL, -- 'ride', 'booking', 'user'
  resource_id UUID NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_admin_logs_resource ON admin_action_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_action_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_action_logs(action_type);

-- Enable RLS
ALTER TABLE admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view action logs"
  ON admin_action_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- Only admins can insert logs
CREATE POLICY "Admins can insert action logs"
  ON admin_action_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- ============================================================================
-- FUNCTION: log_admin_action
-- Purpose: Log any admin action with full state tracking
-- ============================================================================
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_previous_state JSONB DEFAULT NULL,
  p_new_state JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_email TEXT;
  v_log_id UUID;
BEGIN
  -- Get admin email
  SELECT email INTO v_admin_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Insert log entry
  INSERT INTO admin_action_logs (
    admin_id,
    admin_email,
    action_type,
    resource_type,
    resource_id,
    previous_state,
    new_state,
    reason,
    metadata
  ) VALUES (
    auth.uid(),
    COALESCE(v_admin_email, 'unknown'),
    p_action_type,
    p_resource_type,
    p_resource_id,
    p_previous_state,
    p_new_state,
    p_reason,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ============================================================================
-- FUNCTION: admin_edit_ride
-- Purpose: Admin edit ride with full logging and validation
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_edit_ride(
  p_ride_id UUID,
  p_changes JSONB,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride RECORD;
  v_previous_state JSONB;
  v_new_state JSONB;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get current ride state
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  -- Store previous state
  v_previous_state := to_jsonb(v_ride);

  -- Update ride with provided changes
  UPDATE rides
  SET
    origin = COALESCE((p_changes->>'origin')::TEXT, origin),
    origin_lat = COALESCE((p_changes->>'origin_lat')::NUMERIC, origin_lat),
    origin_lng = COALESCE((p_changes->>'origin_lng')::NUMERIC, origin_lng),
    destination = COALESCE((p_changes->>'destination')::TEXT, destination),
    destination_lat = COALESCE((p_changes->>'destination_lat')::NUMERIC, destination_lat),
    destination_lng = COALESCE((p_changes->>'destination_lng')::NUMERIC, destination_lng),
    departure_time = COALESCE((p_changes->>'departure_time')::TIMESTAMPTZ, departure_time),
    available_seats = COALESCE((p_changes->>'available_seats')::INT, available_seats),
    total_seats = COALESCE((p_changes->>'total_seats')::INT, total_seats),
    price_per_seat = COALESCE((p_changes->>'price_per_seat')::NUMERIC, price_per_seat),
    status = COALESCE((p_changes->>'status')::TEXT, status),
    notes = COALESCE((p_changes->>'notes')::TEXT, notes),
    updated_at = now()
  WHERE id = p_ride_id
  RETURNING to_jsonb(rides.*) INTO v_new_state;

  -- Log the action
  PERFORM log_admin_action(
    'ride_edit',
    'ride',
    p_ride_id,
    v_previous_state,
    v_new_state,
    p_reason,
    jsonb_build_object('changes', p_changes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ride updated successfully',
    'ride', v_new_state
  );
END;
$$;

-- ============================================================================
-- FUNCTION: admin_cancel_ride
-- Purpose: Admin cancel ride with notifications and logging
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_cancel_ride(
  p_ride_id UUID,
  p_reason TEXT,
  p_notify_passengers BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride RECORD;
  v_previous_state JSONB;
  v_booking RECORD;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get current ride
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF v_ride.status = 'cancelled' THEN
    RAISE EXCEPTION 'Ride is already cancelled';
  END IF;

  v_previous_state := to_jsonb(v_ride);

  -- Cancel the ride
  UPDATE rides
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_ride_id;

  -- Cancel all active bookings
  UPDATE ride_bookings
  SET 
    status = 'cancelled',
    cancellation_reason = 'Ride cancelled by admin: ' || p_reason,
    cancelled_at = now(),
    updated_at = now()
  WHERE ride_id = p_ride_id
  AND status IN ('pending', 'confirmed');

  -- Create notifications for passengers if requested
  IF p_notify_passengers THEN
    FOR v_booking IN 
      SELECT rb.*, p.full_name as passenger_name
      FROM ride_bookings rb
      JOIN profiles p ON p.id = rb.passenger_id
      WHERE rb.ride_id = p_ride_id
    LOOP
      INSERT INTO notifications (user_id, title, message, type, data)
      VALUES (
        v_booking.passenger_id,
        'Ride Cancelled',
        'Your booked ride from ' || v_ride.origin || ' to ' || v_ride.destination || ' has been cancelled by an administrator. Reason: ' || p_reason,
        'ride_cancelled',
        jsonb_build_object('ride_id', p_ride_id, 'reason', p_reason)
      );
    END LOOP;
  END IF;

  -- Log the action
  PERFORM log_admin_action(
    'ride_cancel',
    'ride',
    p_ride_id,
    v_previous_state,
    jsonb_build_object('status', 'cancelled'),
    p_reason,
    jsonb_build_object('notify_passengers', p_notify_passengers)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ride cancelled successfully'
  );
END;
$$;

-- ============================================================================
-- FUNCTION: admin_delete_ride
-- Purpose: Admin permanently delete ride (super_admin only)
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_delete_ride(
  p_ride_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride RECORD;
  v_previous_state JSONB;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super_admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'super_admin'
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Unauthorized: Super admin access required';
  END IF;

  -- Get current ride
  SELECT * INTO v_ride FROM rides WHERE id = p_ride_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  v_previous_state := to_jsonb(v_ride);

  -- Log before deletion
  PERFORM log_admin_action(
    'ride_delete',
    'ride',
    p_ride_id,
    v_previous_state,
    NULL,
    p_reason,
    '{}'::jsonb
  );

  -- Delete the ride (cascades to bookings)
  DELETE FROM rides WHERE id = p_ride_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Ride permanently deleted'
  );
END;
$$;

-- ============================================================================
-- FUNCTION: admin_approve_booking
-- Purpose: Admin approve/confirm a pending booking
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_approve_booking(
  p_booking_id UUID,
  p_reason TEXT DEFAULT 'Approved by admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_ride RECORD;
  v_previous_state JSONB;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get booking
  SELECT * INTO v_booking FROM ride_bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Only pending bookings can be approved. Current status: %', v_booking.status;
  END IF;

  -- Get ride
  SELECT * INTO v_ride FROM rides WHERE id = v_booking.ride_id;
  
  IF v_ride.available_seats < v_booking.seats_requested THEN
    RAISE EXCEPTION 'Not enough seats available. Requested: %, Available: %', v_booking.seats_requested, v_ride.available_seats;
  END IF;

  v_previous_state := to_jsonb(v_booking);

  -- Update booking
  UPDATE ride_bookings
  SET status = 'confirmed', updated_at = now()
  WHERE id = p_booking_id;

  -- Update ride seats
  UPDATE rides
  SET 
    available_seats = available_seats - v_booking.seats_requested,
    updated_at = now()
  WHERE id = v_booking.ride_id;

  -- Notify passenger
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_booking.passenger_id,
    'Booking Approved',
    'Your booking for the ride from ' || v_ride.origin || ' to ' || v_ride.destination || ' has been approved.',
    'booking_confirmed',
    jsonb_build_object('booking_id', p_booking_id, 'ride_id', v_booking.ride_id)
  );

  -- Log the action
  PERFORM log_admin_action(
    'booking_approve',
    'booking',
    p_booking_id,
    v_previous_state,
    jsonb_build_object('status', 'confirmed'),
    p_reason,
    '{}'::jsonb
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking approved successfully'
  );
END;
$$;

-- ============================================================================
-- FUNCTION: admin_cancel_booking
-- Purpose: Admin cancel a booking with optional refund
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_cancel_booking(
  p_booking_id UUID,
  p_reason TEXT,
  p_refund_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_ride RECORD;
  v_previous_state JSONB;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get booking
  SELECT * INTO v_booking FROM ride_bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Booking is already cancelled';
  END IF;

  -- Get ride for seat restoration
  SELECT * INTO v_ride FROM rides WHERE id = v_booking.ride_id;

  v_previous_state := to_jsonb(v_booking);

  -- Update booking
  UPDATE ride_bookings
  SET 
    status = 'cancelled',
    cancellation_reason = 'Cancelled by admin: ' || p_reason,
    cancelled_at = now(),
    updated_at = now()
  WHERE id = p_booking_id;

  -- Restore seats if booking was confirmed
  IF v_booking.status = 'confirmed' THEN
    UPDATE rides
    SET 
      available_seats = LEAST(total_seats, available_seats + v_booking.seats_requested),
      updated_at = now()
    WHERE id = v_booking.ride_id;
  END IF;

  -- Notify passenger
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_booking.passenger_id,
    'Booking Cancelled',
    'Your booking for the ride from ' || v_ride.origin || ' to ' || v_ride.destination || ' has been cancelled by an administrator. Reason: ' || p_reason,
    'booking_cancelled',
    jsonb_build_object('booking_id', p_booking_id, 'reason', p_reason, 'refund_amount', p_refund_amount)
  );

  -- Log the action
  PERFORM log_admin_action(
    'booking_cancel',
    'booking',
    p_booking_id,
    v_previous_state,
    jsonb_build_object('status', 'cancelled'),
    p_reason,
    jsonb_build_object('refund_amount', p_refund_amount)
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking cancelled successfully',
    'refund_amount', p_refund_amount
  );
END;
$$;

-- ============================================================================
-- FUNCTION: admin_decline_booking
-- Purpose: Admin decline a pending booking
-- ============================================================================
CREATE OR REPLACE FUNCTION admin_decline_booking(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_ride RECORD;
  v_previous_state JSONB;
  v_is_admin BOOLEAN;
BEGIN
  -- Check if user is admin
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'super_admin')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get booking
  SELECT * INTO v_booking FROM ride_bookings WHERE id = p_booking_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.status != 'pending' THEN
    RAISE EXCEPTION 'Only pending bookings can be declined. Current status: %', v_booking.status;
  END IF;

  -- Get ride for notification
  SELECT * INTO v_ride FROM rides WHERE id = v_booking.ride_id;

  v_previous_state := to_jsonb(v_booking);

  -- Update booking
  UPDATE ride_bookings
  SET 
    status = 'declined',
    cancellation_reason = 'Declined by admin: ' || p_reason,
    updated_at = now()
  WHERE id = p_booking_id;

  -- Notify passenger
  INSERT INTO notifications (user_id, title, message, type, data)
  VALUES (
    v_booking.passenger_id,
    'Booking Declined',
    'Your booking request for the ride from ' || v_ride.origin || ' to ' || v_ride.destination || ' has been declined. Reason: ' || p_reason,
    'booking_declined',
    jsonb_build_object('booking_id', p_booking_id, 'reason', p_reason)
  );

  -- Log the action
  PERFORM log_admin_action(
    'booking_decline',
    'booking',
    p_booking_id,
    v_previous_state,
    jsonb_build_object('status', 'declined'),
    p_reason,
    '{}'::jsonb
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Booking declined successfully'
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;
GRANT EXECUTE ON FUNCTION admin_edit_ride TO authenticated;
GRANT EXECUTE ON FUNCTION admin_cancel_ride TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_ride TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_booking TO authenticated;
GRANT EXECUTE ON FUNCTION admin_cancel_booking TO authenticated;
GRANT EXECUTE ON FUNCTION admin_decline_booking TO authenticated;
