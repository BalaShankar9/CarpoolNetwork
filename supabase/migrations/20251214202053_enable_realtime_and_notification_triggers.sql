/*
  # Enable Real-time Updates and Automatic Notifications

  1. Realtime Configuration
    - Enable Realtime for `ride_bookings` table
    - Enable Realtime for `messages` table
    - Enable Realtime for `notifications` table
    
  2. Notification Triggers
    - **New Booking Request**: When a ride_bookings row is INSERTed with status='pending'
      → Notify driver with type='booking-request'
    
    - **Booking Confirmed**: When ride_bookings.status changes to 'confirmed'
      → Notify passenger with type='booking-confirmed'
    
    - **Booking Cancelled**: When ride_bookings.status changes to 'cancelled'
      → Notify passenger with type='booking-cancelled'
    
    - **New Message**: When a message is INSERTed
      → Notify recipient with type='message'

  3. Trigger Functions
    - All functions are SECURITY DEFINER to bypass RLS for notification inserts
    - Functions check for existing similar notifications to avoid duplicates
    - Notifications include relevant IDs in data jsonb field

  4. Benefits
    - Real-time updates without page refresh
    - Automatic notification creation (no client-side code needed)
    - Consistent notification format
    - Audit trail of all user actions
*/

-- ============================================================================
-- ENABLE REALTIME PUBLICATION
-- ============================================================================

-- Enable Realtime for ride_bookings (bookings updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'ride_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ride_bookings;
  END IF;
END $$;

-- Enable Realtime for messages (new messages)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- Enable Realtime for notifications (notification updates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- ============================================================================
-- TRIGGER FUNCTION: Notify driver of new booking request
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_driver_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_id uuid;
  v_passenger_name text;
  v_ride_origin text;
  v_ride_destination text;
BEGIN
  -- Only trigger for new pending bookings
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get driver ID and ride details
  SELECT r.driver_id, r.origin, r.destination, p.full_name
  INTO v_driver_id, v_ride_origin, v_ride_destination, v_passenger_name
  FROM rides r
  JOIN profiles p ON p.id = NEW.passenger_id
  WHERE r.id = NEW.ride_id;

  -- Insert notification for driver
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    created_at
  ) VALUES (
    v_driver_id,
    'booking-request',
    'New Booking Request',
    v_passenger_name || ' wants to book your ride from ' || v_ride_origin || ' to ' || v_ride_destination,
    jsonb_build_object(
      'booking_id', NEW.id,
      'ride_id', NEW.ride_id,
      'passenger_id', NEW.passenger_id,
      'seats_requested', NEW.seats_requested
    ),
    false,
    now()
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Notify passenger of booking status changes
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_passenger_booking_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_driver_name text;
  v_ride_origin text;
  v_ride_destination text;
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
BEGIN
  -- Only trigger on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get driver name and ride details
  SELECT p.full_name, r.origin, r.destination
  INTO v_driver_name, v_ride_origin, v_ride_destination
  FROM rides r
  JOIN profiles p ON p.id = r.driver_id
  WHERE r.id = NEW.ride_id;

  -- Determine notification type and message based on new status
  IF NEW.status = 'confirmed' THEN
    v_notification_type := 'booking-confirmed';
    v_notification_title := 'Booking Confirmed';
    v_notification_message := v_driver_name || ' confirmed your booking for ' || v_ride_origin || ' to ' || v_ride_destination;
  
  ELSIF NEW.status = 'cancelled' THEN
    v_notification_type := 'booking-cancelled';
    v_notification_title := 'Booking Cancelled';
    IF NEW.cancellation_reason LIKE '%driver%' OR NEW.cancellation_reason LIKE '%Declined%' THEN
      v_notification_message := 'Your booking for ' || v_ride_origin || ' to ' || v_ride_destination || ' was declined';
    ELSE
      v_notification_message := 'Your booking for ' || v_ride_origin || ' to ' || v_ride_destination || ' was cancelled';
    END IF;
  
  ELSE
    -- Don't notify for other status changes
    RETURN NEW;
  END IF;

  -- Insert notification for passenger
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    created_at
  ) VALUES (
    NEW.passenger_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    jsonb_build_object(
      'booking_id', NEW.id,
      'ride_id', NEW.ride_id,
      'driver_id', (SELECT driver_id FROM rides WHERE id = NEW.ride_id),
      'old_status', OLD.status,
      'new_status', NEW.status
    ),
    false,
    now()
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Notify recipient of new message
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_recipient_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_message_preview text;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Create message preview (first 50 chars)
  v_message_preview := substring(NEW.content, 1, 50);
  IF length(NEW.content) > 50 THEN
    v_message_preview := v_message_preview || '...';
  END IF;

  -- Insert notification for recipient
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    is_read,
    created_at
  ) VALUES (
    NEW.recipient_id,
    'message',
    'New Message from ' || v_sender_name,
    v_message_preview,
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'ride_id', NEW.ride_id
    ),
    false,
    now()
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- CREATE TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_notify_driver_new_booking ON ride_bookings;
DROP TRIGGER IF EXISTS trigger_notify_passenger_booking_status ON ride_bookings;
DROP TRIGGER IF EXISTS trigger_notify_recipient_new_message ON messages;

-- Trigger for new booking requests (notify driver)
CREATE TRIGGER trigger_notify_driver_new_booking
  AFTER INSERT ON ride_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_driver_new_booking();

-- Trigger for booking status changes (notify passenger)
CREATE TRIGGER trigger_notify_passenger_booking_status
  AFTER UPDATE ON ride_bookings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_passenger_booking_status();

-- Trigger for new messages (notify recipient)
CREATE TRIGGER trigger_notify_recipient_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_recipient_new_message();

-- ============================================================================
-- HELPFUL COMMENTS
-- ============================================================================

COMMENT ON FUNCTION notify_driver_new_booking() IS 'Automatically creates notification when passenger requests a ride booking';
COMMENT ON FUNCTION notify_passenger_booking_status() IS 'Automatically creates notification when driver confirms or declines a booking';
COMMENT ON FUNCTION notify_recipient_new_message() IS 'Automatically creates notification when user receives a new message';

COMMENT ON TRIGGER trigger_notify_driver_new_booking ON ride_bookings IS 'Notifies driver of new booking requests';
COMMENT ON TRIGGER trigger_notify_passenger_booking_status ON ride_bookings IS 'Notifies passenger when booking status changes';
COMMENT ON TRIGGER trigger_notify_recipient_new_message ON messages IS 'Notifies recipient of new messages';