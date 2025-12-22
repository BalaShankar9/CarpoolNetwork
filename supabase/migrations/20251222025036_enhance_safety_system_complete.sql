/*
  # Enhance Safety & Moderation System

  Extends existing safety_reports table and creates additional safety system tables.
*/

-- Enhance existing safety_reports table
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS reporter_name TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS reporter_anonymous BOOLEAN DEFAULT false;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS reported_user_name TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES ride_bookings(id) ON DELETE SET NULL;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS incident_location TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS resolution_notes TEXT;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE safety_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Update category from incident_type if not set
UPDATE safety_reports SET category = incident_type WHERE category IS NULL AND incident_type IS NOT NULL;

-- Create safety_incidents table
CREATE TABLE IF NOT EXISTS safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL DEFAULT ('INC-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(FLOOR(RANDOM() * 999999 + 1)::TEXT, 6, '0')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category TEXT NOT NULL DEFAULT 'other',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'action_taken', 'resolved', 'closed', 'reopened')),
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  affected_user_ids UUID[] DEFAULT '{}',
  investigator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  investigation_notes TEXT,
  investigation_started_at TIMESTAMPTZ,
  investigation_completed_at TIMESTAMPTZ,
  resolution_summary TEXT,
  action_taken TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  related_report_ids UUID[] DEFAULT '{}',
  related_ride_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  suspension_type TEXT NOT NULL DEFAULT 'temporary' CHECK (suspension_type IN ('temporary', 'permanent', 'pending_review')),
  reason TEXT NOT NULL,
  admin_notes TEXT,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL,
  report_ids UUID[] DEFAULT '{}',
  restrictions JSONB DEFAULT '{"can_book": false, "can_drive": false, "can_message": false}'::jsonb,
  suspended_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  lifted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lifted_at TIMESTAMPTZ,
  lift_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create safety_warnings table
CREATE TABLE IF NOT EXISTS safety_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warning_level INTEGER NOT NULL DEFAULT 1 CHECK (warning_level >= 1 AND warning_level <= 3),
  warning_type TEXT NOT NULL,
  message TEXT NOT NULL,
  report_id UUID REFERENCES safety_reports(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  issued_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  escalated BOOLEAN DEFAULT false,
  escalation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create incident_evidence table
CREATE TABLE IF NOT EXISTS incident_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE CASCADE,
  report_id UUID REFERENCES safety_reports(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'other' CHECK (evidence_type IN ('screenshot', 'photo', 'message', 'document', 'video', 'audio', 'other')),
  description TEXT,
  file_path TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create safety_actions_log table
CREATE TABLE IF NOT EXISTS safety_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'report_created', 'report_reviewed', 'report_dismissed', 'incident_created',
    'investigation_started', 'investigation_completed', 'user_warned', 'user_suspended',
    'suspension_lifted', 'evidence_added', 'status_changed', 'bulk_action'
  )),
  action_description TEXT NOT NULL,
  report_id UUID REFERENCES safety_reports(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES safety_incidents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  suspension_id UUID REFERENCES user_suspensions(id) ON DELETE SET NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  performed_by_name TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_safety_reports_assigned ON safety_reports(assigned_to);
CREATE INDEX IF NOT EXISTS idx_safety_reports_priority ON safety_reports(priority DESC);
CREATE INDEX IF NOT EXISTS idx_safety_reports_updated ON safety_reports(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_number ON safety_incidents(incident_number);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_status ON safety_incidents(status);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity ON safety_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_user ON safety_incidents(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_user ON user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_active ON user_suspensions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_suspensions_dates ON user_suspensions(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_user ON safety_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_warnings_level ON safety_warnings(warning_level);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_type ON safety_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_safety_actions_log_date ON safety_actions_log(created_at DESC);

-- Enable RLS
ALTER TABLE safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_actions_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins manage incidents" ON safety_incidents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins manage suspensions" ON user_suspensions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Users view own warnings" ON safety_warnings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage warnings" ON safety_warnings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins manage evidence" ON incident_evidence FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "Admins view actions log" ON safety_actions_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "System log actions" ON safety_actions_log FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_safety_incidents_updated_at ON safety_incidents;
CREATE TRIGGER update_safety_incidents_updated_at BEFORE UPDATE ON safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_suspensions_updated_at ON user_suspensions;
CREATE TRIGGER update_user_suspensions_updated_at BEFORE UPDATE ON user_suspensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_safety_reports_updated_at ON safety_reports;
CREATE TRIGGER update_safety_reports_updated_at BEFORE UPDATE ON safety_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
