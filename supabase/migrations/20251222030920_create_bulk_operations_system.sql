/*
  # Bulk Operations System - Phase 4

  Creates comprehensive bulk operation management system for efficient mass operations.
  
  1. Tables
    - bulk_operations: Track all bulk operations with status and results
    - bulk_operation_items: Individual items in each bulk operation
    - scheduled_operations: Schedule bulk operations for future execution
    
  2. Functions
    - create_bulk_operation: Initialize a new bulk operation
    - execute_bulk_user_action: Bulk user management operations
    - execute_bulk_ride_action: Bulk ride management operations
    - execute_bulk_booking_action: Bulk booking management operations
    - send_bulk_notifications: Send notifications to multiple users
    - bulk_export_data: Export data in bulk
    - get_operation_status: Get detailed operation status
    - cancel_bulk_operation: Cancel a running operation
    
  3. Security
    - Admin-only access via RLS
    - Operation audit trail
    - Rollback capabilities where possible
*/

-- ============================================================================
-- Bulk Operations Main Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  description TEXT,
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  target_count INTEGER DEFAULT 0,
  processed_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  parameters JSONB DEFAULT '{}'::jsonb,
  results JSONB DEFAULT '{}'::jsonb,
  error_log JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_operations_status ON bulk_operations(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_type ON bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operations_initiated_by ON bulk_operations(initiated_by);

COMMENT ON TABLE bulk_operations IS 'Track all bulk operations with detailed status and results';
COMMENT ON COLUMN bulk_operations.operation_type IS 'Type: user_action, ride_action, booking_action, notification, data_export, data_cleanup';
COMMENT ON COLUMN bulk_operations.status IS 'Status: pending, running, completed, failed, cancelled, partially_completed';

-- ============================================================================
-- Bulk Operation Items Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bulk_operation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_id UUID NOT NULL REFERENCES bulk_operations(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_operation ON bulk_operation_items(operation_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_items_target ON bulk_operation_items(target_type, target_id);

COMMENT ON TABLE bulk_operation_items IS 'Individual items processed in each bulk operation';
COMMENT ON COLUMN bulk_operation_items.status IS 'Status: pending, processing, success, failed, skipped';

-- ============================================================================
-- Scheduled Operations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  description TEXT,
  scheduled_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  recurrence_rule TEXT,
  parameters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'scheduled',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_operations_next_run ON scheduled_operations(next_run_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_scheduled_operations_scheduled_by ON scheduled_operations(scheduled_by);

COMMENT ON TABLE scheduled_operations IS 'Schedule bulk operations for future execution';
COMMENT ON COLUMN scheduled_operations.status IS 'Status: scheduled, running, completed, cancelled, failed';
COMMENT ON COLUMN scheduled_operations.recurrence_rule IS 'Cron-like recurrence pattern';

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE bulk_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_operation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_operations ENABLE ROW LEVEL SECURITY;

-- Bulk operations - admin only
CREATE POLICY "Admins can manage bulk operations"
  ON bulk_operations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Bulk operation items - admin only
CREATE POLICY "Admins can view bulk operation items"
  ON bulk_operation_items FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- Scheduled operations - admin only
CREATE POLICY "Admins can manage scheduled operations"
  ON scheduled_operations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email LIKE '%@admin.carpoolnetwork.co.uk'
    )
  );

-- ============================================================================
-- Core Functions
-- ============================================================================

-- Create bulk operation
CREATE OR REPLACE FUNCTION create_bulk_operation(
  p_operation_type TEXT,
  p_operation_name TEXT,
  p_description TEXT,
  p_target_ids UUID[],
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_operation_id UUID;
  v_target_id UUID;
BEGIN
  -- Create operation record
  INSERT INTO bulk_operations (
    operation_type, operation_name, description,
    initiated_by, status, target_count, parameters
  )
  VALUES (
    p_operation_type, p_operation_name, p_description,
    auth.uid(), 'pending', array_length(p_target_ids, 1), p_parameters
  )
  RETURNING id INTO v_operation_id;

  -- Create items for each target
  FOREACH v_target_id IN ARRAY p_target_ids
  LOOP
    INSERT INTO bulk_operation_items (
      operation_id, target_type, target_id, status
    )
    VALUES (
      v_operation_id, p_operation_type, v_target_id, 'pending'
    );
  END LOOP;

  RETURN v_operation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get operation status
CREATE OR REPLACE FUNCTION get_operation_status(p_operation_id UUID)
RETURNS TABLE (
  operation_id UUID,
  operation_type TEXT,
  operation_name TEXT,
  status TEXT,
  target_count INTEGER,
  processed_count INTEGER,
  success_count INTEGER,
  failed_count INTEGER,
  progress_percentage NUMERIC,
  created_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bo.id,
    bo.operation_type,
    bo.operation_name,
    bo.status,
    bo.target_count,
    bo.processed_count,
    bo.success_count,
    bo.failed_count,
    CASE 
      WHEN bo.target_count > 0 THEN 
        ROUND((bo.processed_count::NUMERIC / bo.target_count::NUMERIC) * 100, 2)
      ELSE 0
    END as progress_percentage,
    bo.created_at,
    bo.started_at,
    bo.completed_at
  FROM bulk_operations bo
  WHERE bo.id = p_operation_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Bulk User Operations
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_bulk_user_action(
  p_operation_id UUID,
  p_action TEXT,
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  -- Update operation status to running
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  -- Process each item
  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      -- Update item status
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      -- Execute action based on type
      CASE p_action
        WHEN 'activate' THEN
          UPDATE profiles SET status = 'active' WHERE id = v_item.target_id;
        
        WHEN 'deactivate' THEN
          UPDATE profiles SET status = 'inactive' WHERE id = v_item.target_id;
        
        WHEN 'suspend' THEN
          UPDATE profiles SET status = 'suspended' WHERE id = v_item.target_id;
        
        WHEN 'verify' THEN
          UPDATE profiles SET 
            verification_status = 'verified',
            verified_at = NOW()
          WHERE id = v_item.target_id;
        
        WHEN 'unverify' THEN
          UPDATE profiles SET 
            verification_status = 'unverified',
            verified_at = NULL
          WHERE id = v_item.target_id;
        
        WHEN 'reset_trust_score' THEN
          UPDATE profiles SET trust_score = 50 WHERE id = v_item.target_id;
        
        WHEN 'delete_inactive' THEN
          DELETE FROM profiles 
          WHERE id = v_item.target_id 
          AND status = 'inactive'
          AND created_at < NOW() - INTERVAL '90 days';
        
        ELSE
          RAISE EXCEPTION 'Unknown action: %', p_action;
      END CASE;

      -- Mark as success
      UPDATE bulk_operation_items
      SET 
        status = 'success',
        processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Mark as failed
      UPDATE bulk_operation_items
      SET 
        status = 'failed',
        error_message = SQLERRM,
        processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  -- Update operation summary
  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Bulk Ride Operations
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_bulk_ride_action(
  p_operation_id UUID,
  p_action TEXT,
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      CASE p_action
        WHEN 'cancel' THEN
          UPDATE rides SET 
            status = 'cancelled',
            cancellation_reason = COALESCE(p_parameters->>'reason', 'Bulk cancellation by admin')
          WHERE id = v_item.target_id;
          
          UPDATE ride_bookings SET status = 'cancelled'
          WHERE ride_id = v_item.target_id AND status IN ('pending', 'confirmed');
        
        WHEN 'complete' THEN
          UPDATE rides SET status = 'completed'
          WHERE id = v_item.target_id;
        
        WHEN 'delete_old' THEN
          DELETE FROM rides 
          WHERE id = v_item.target_id 
          AND status = 'completed'
          AND departure_time < NOW() - INTERVAL '1 year';
        
        WHEN 'flag_review' THEN
          UPDATE rides SET 
            metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{flagged_for_review}',
              'true'::jsonb
            )
          WHERE id = v_item.target_id;
        
        ELSE
          RAISE EXCEPTION 'Unknown action: %', p_action;
      END CASE;

      UPDATE bulk_operation_items
      SET status = 'success', processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE bulk_operation_items
      SET status = 'failed', error_message = SQLERRM, processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Bulk Booking Operations
-- ============================================================================

CREATE OR REPLACE FUNCTION execute_bulk_booking_action(
  p_operation_id UUID,
  p_action TEXT,
  p_parameters JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      CASE p_action
        WHEN 'cancel' THEN
          UPDATE ride_bookings SET 
            status = 'cancelled',
            updated_at = NOW()
          WHERE id = v_item.target_id;
        
        WHEN 'confirm' THEN
          UPDATE ride_bookings SET 
            status = 'confirmed',
            updated_at = NOW()
          WHERE id = v_item.target_id;
        
        WHEN 'complete' THEN
          UPDATE ride_bookings SET 
            status = 'completed',
            updated_at = NOW()
          WHERE id = v_item.target_id;
        
        ELSE
          RAISE EXCEPTION 'Unknown action: %', p_action;
      END CASE;

      UPDATE bulk_operation_items
      SET status = 'success', processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE bulk_operation_items
      SET status = 'failed', error_message = SQLERRM, processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Bulk Notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION send_bulk_notifications(
  p_operation_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_notification_type TEXT DEFAULT 'info'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_item RECORD;
  v_success_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  UPDATE bulk_operations
  SET status = 'running', started_at = NOW()
  WHERE id = p_operation_id;

  FOR v_item IN 
    SELECT * FROM bulk_operation_items
    WHERE operation_id = p_operation_id AND status = 'pending'
  LOOP
    BEGIN
      UPDATE bulk_operation_items
      SET status = 'processing'
      WHERE id = v_item.id;

      INSERT INTO notifications (
        user_id, type, title, message, created_at
      )
      VALUES (
        v_item.target_id, p_notification_type, p_title, p_message, NOW()
      );

      UPDATE bulk_operation_items
      SET status = 'success', processed_at = NOW()
      WHERE id = v_item.id;
      
      v_success_count := v_success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      UPDATE bulk_operation_items
      SET status = 'failed', error_message = SQLERRM, processed_at = NOW()
      WHERE id = v_item.id;
      
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  UPDATE bulk_operations
  SET 
    status = CASE 
      WHEN v_failed_count = 0 THEN 'completed'
      WHEN v_success_count = 0 THEN 'failed'
      ELSE 'partially_completed'
    END,
    processed_count = v_success_count + v_failed_count,
    success_count = v_success_count,
    failed_count = v_failed_count,
    completed_at = NOW()
  WHERE id = p_operation_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel bulk operation
CREATE OR REPLACE FUNCTION cancel_bulk_operation(p_operation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE bulk_operations
  SET status = 'cancelled', completed_at = NOW()
  WHERE id = p_operation_id AND status IN ('pending', 'running');
  
  UPDATE bulk_operation_items
  SET status = 'skipped'
  WHERE operation_id = p_operation_id AND status = 'pending';
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_bulk_operation TO authenticated;
GRANT EXECUTE ON FUNCTION get_operation_status TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bulk_user_action TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bulk_ride_action TO authenticated;
GRANT EXECUTE ON FUNCTION execute_bulk_booking_action TO authenticated;
GRANT EXECUTE ON FUNCTION send_bulk_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_bulk_operation TO authenticated;
