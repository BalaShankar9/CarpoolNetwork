/*
  # Create Emergency Alerts System

  1. Tables
    - `emergency_alerts` - Stores emergency SOS activations
    - `emergency_notifications` - Tracks notifications sent to emergency contacts
    
  2. Security
    - Users can create their own emergency alerts
    - Users can read their own alerts
    - Emergency contacts can be notified
    - RLS policies ensure privacy
    
  3. Important Notes
    - Critical safety feature
    - Must be highly reliable
    - Automatic notification system
*/

-- Create emergency_alerts table
CREATE TABLE IF NOT EXISTS emergency_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ride_id uuid REFERENCES rides(id) ON DELETE SET NULL,
  location geography(POINT),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'false_alarm')),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create emergency_notifications table
CREATE TABLE IF NOT EXISTS emergency_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_alert_id uuid NOT NULL REFERENCES emergency_alerts(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES emergency_contacts(id) ON DELETE CASCADE,
  notification_sent boolean DEFAULT false,
  sent_at timestamptz,
  delivery_status text DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE emergency_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for emergency_alerts

-- Users can create their own emergency alerts
CREATE POLICY "Users can create own emergency alerts"
ON emergency_alerts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can read their own emergency alerts
CREATE POLICY "Users can read own emergency alerts"
ON emergency_alerts FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can update their own emergency alerts
CREATE POLICY "Users can update own emergency alerts"
ON emergency_alerts FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for emergency_notifications

-- Users can read notifications for their alerts
CREATE POLICY "Users can read own alert notifications"
ON emergency_notifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM emergency_alerts
    WHERE emergency_alerts.id = emergency_notifications.emergency_alert_id
    AND emergency_alerts.user_id = auth.uid()
  )
);

-- Users can create notifications for their alerts
CREATE POLICY "Users can create alert notifications"
ON emergency_notifications FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM emergency_alerts
    WHERE emergency_alerts.id = emergency_notifications.emergency_alert_id
    AND emergency_alerts.user_id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_user_id ON emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_ride_id ON emergency_alerts(ride_id);
CREATE INDEX IF NOT EXISTS idx_emergency_alerts_status ON emergency_alerts(status);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_alert_id ON emergency_notifications(emergency_alert_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notifications_contact_id ON emergency_notifications(contact_id);

-- Add helpful comments
COMMENT ON TABLE emergency_alerts IS 'Stores emergency SOS alerts triggered by users during rides';
COMMENT ON TABLE emergency_notifications IS 'Tracks notifications sent to emergency contacts when alerts are triggered';
COMMENT ON COLUMN emergency_alerts.location IS 'Geographic location where the emergency alert was triggered';
COMMENT ON COLUMN emergency_alerts.status IS 'Current status of the emergency alert: active, resolved, or false_alarm';
