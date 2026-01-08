-- Phase 5: Admin User Management & Account Control
-- Comprehensive user management, verification, and account controls

-- =====================================================
-- 1. ADMIN USER NOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_user_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general' CHECK (note_type IN ('general', 'warning', 'positive', 'investigation', 'support')),
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_notes_user ON admin_user_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notes_created_by ON admin_user_notes(created_by);

-- =====================================================
-- 2. ADMIN USER FLAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_user_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('review_needed', 'suspicious', 'high_risk', 'vip', 'watch', 'fraud_alert')),
  reason TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  resolution_note TEXT,
  flagged_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, flag_type, is_resolved)
);

CREATE INDEX IF NOT EXISTS idx_user_flags_user ON admin_user_flags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flags_type ON admin_user_flags(flag_type, is_resolved);
CREATE INDEX IF NOT EXISTS idx_user_flags_priority ON admin_user_flags(priority, is_resolved);

-- =====================================================
-- 3. USER ACCOUNT ACTIONS LOG (Audit Trail)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_account_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created', 'verified', 'suspended', 'unsuspended', 'banned', 'unbanned',
    'warned', 'profile_edited', 'password_reset', 'email_changed',
    'trust_score_adjusted', 'badge_added', 'badge_removed', 'role_changed',
    'data_exported', 'account_merged', 'restriction_added', 'restriction_removed'
  )),
  action_details JSONB DEFAULT '{}',
  reason TEXT,
  performed_by UUID REFERENCES profiles(id), -- NULL for system actions
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_actions_user ON user_account_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_actions_type ON user_account_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_account_actions_date ON user_account_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_account_actions_performer ON user_account_actions(performed_by);

-- =====================================================
-- 4. USER WARNINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('behavior', 'content', 'safety', 'spam', 'fraud', 'terms_violation', 'other')),
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('notice', 'warning', 'final_warning')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  related_entity_type TEXT, -- 'ride', 'booking', 'message', 'post', etc.
  related_entity_id UUID,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ, -- Warning may expire
  issued_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_warnings_user ON user_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_warnings_type ON user_warnings(warning_type);
CREATE INDEX IF NOT EXISTS idx_user_warnings_severity ON user_warnings(severity);

-- =====================================================
-- 5. VERIFICATION DOCUMENTS TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('id_card', 'passport', 'drivers_license', 'selfie', 'proof_of_address', 'vehicle_registration', 'insurance')),
  document_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'needs_review')),
  rejection_reason TEXT,
  verified_data JSONB DEFAULT '{}', -- Extracted/verified data
  submitted_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_verification_docs_user ON verification_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_verification_docs_type ON verification_documents(document_type);

-- =====================================================
-- 6. ADD COLUMNS TO PROFILES TABLE
-- =====================================================
DO $$
BEGIN
  -- Account status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'account_status') THEN
    ALTER TABLE profiles ADD COLUMN account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned', 'restricted', 'pending_verification', 'deactivated'));
  END IF;

  -- Suspension details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspension_reason') THEN
    ALTER TABLE profiles ADD COLUMN suspension_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspension_expires_at') THEN
    ALTER TABLE profiles ADD COLUMN suspension_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'suspended_by') THEN
    ALTER TABLE profiles ADD COLUMN suspended_by UUID REFERENCES profiles(id);
  END IF;

  -- Trust score
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'trust_score') THEN
    ALTER TABLE profiles ADD COLUMN trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100);
  END IF;

  -- Verification details
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'identity_verified_at') THEN
    ALTER TABLE profiles ADD COLUMN identity_verified_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'identity_verified_by') THEN
    ALTER TABLE profiles ADD COLUMN identity_verified_by UUID REFERENCES profiles(id);
  END IF;

  -- Badges
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'badges') THEN
    ALTER TABLE profiles ADD COLUMN badges TEXT[] DEFAULT '{}';
  END IF;

  -- Warning count (for quick reference)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'warning_count') THEN
    ALTER TABLE profiles ADD COLUMN warning_count INTEGER DEFAULT 0;
  END IF;

  -- Restrictions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'restrictions') THEN
    ALTER TABLE profiles ADD COLUMN restrictions JSONB DEFAULT '{}';
  END IF;

  -- Admin notes count (for quick reference)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_notes_count') THEN
    ALTER TABLE profiles ADD COLUMN admin_notes_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Index for user searches
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_trust_score ON profiles(trust_score);
CREATE INDEX IF NOT EXISTS idx_profiles_identity_verified ON profiles(identity_verified_at);

-- =====================================================
-- 7. RPC FUNCTIONS - USER SEARCH & STATS
-- =====================================================

-- Get user management statistics
CREATE OR REPLACE FUNCTION admin_get_user_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'active_users', (SELECT COUNT(*) FROM profiles WHERE account_status = 'active'),
    'suspended_users', (SELECT COUNT(*) FROM profiles WHERE account_status = 'suspended'),
    'banned_users', (SELECT COUNT(*) FROM profiles WHERE account_status = 'banned'),
    'verified_users', (SELECT COUNT(*) FROM profiles WHERE identity_verified_at IS NOT NULL),
    'pending_verification', (SELECT COUNT(*) FROM verification_documents WHERE status = 'pending'),
    'new_users_today', (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE),
    'new_users_week', (SELECT COUNT(*) FROM profiles WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'active_today', (SELECT COUNT(*) FROM profiles WHERE last_active_at >= CURRENT_DATE),
    'flagged_users', (SELECT COUNT(DISTINCT user_id) FROM admin_user_flags WHERE is_resolved = false),
    'avg_trust_score', (SELECT ROUND(AVG(trust_score)::numeric, 1) FROM profiles WHERE account_status = 'active'),
    'warnings_this_week', (SELECT COUNT(*) FROM user_warnings WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')
  ) INTO result;

  RETURN result;
END;
$$;

-- Advanced user search
CREATE OR REPLACE FUNCTION admin_search_users(
  p_search TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_verified_only BOOLEAN DEFAULT NULL,
  p_flagged_only BOOLEAN DEFAULT false,
  p_min_trust_score INTEGER DEFAULT NULL,
  p_max_trust_score INTEGER DEFAULT NULL,
  p_joined_from TIMESTAMPTZ DEFAULT NULL,
  p_joined_to TIMESTAMPTZ DEFAULT NULL,
  p_last_active_from TIMESTAMPTZ DEFAULT NULL,
  p_last_active_to TIMESTAMPTZ DEFAULT NULL,
  p_has_warnings BOOLEAN DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'created_at',
  p_sort_order TEXT DEFAULT 'desc',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  total_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM profiles p
  WHERE (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p.account_status = p_status)
    AND (p_verified_only IS NULL OR (p_verified_only = true AND p.identity_verified_at IS NOT NULL) OR (p_verified_only = false AND p.identity_verified_at IS NULL))
    AND (p_flagged_only = false OR EXISTS (SELECT 1 FROM admin_user_flags f WHERE f.user_id = p.id AND f.is_resolved = false))
    AND (p_min_trust_score IS NULL OR p.trust_score >= p_min_trust_score)
    AND (p_max_trust_score IS NULL OR p.trust_score <= p_max_trust_score)
    AND (p_joined_from IS NULL OR p.created_at >= p_joined_from)
    AND (p_joined_to IS NULL OR p.created_at <= p_joined_to)
    AND (p_last_active_from IS NULL OR p.last_active_at >= p_last_active_from)
    AND (p_last_active_to IS NULL OR p.last_active_at <= p_last_active_to)
    AND (p_has_warnings IS NULL OR (p_has_warnings = true AND p.warning_count > 0) OR (p_has_warnings = false AND p.warning_count = 0));

  -- Get results
  SELECT json_build_object(
    'total', total_count,
    'users', COALESCE((
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          p.id,
          p.full_name,
          p.email,
          p.phone,
          p.avatar_url,
          p.account_status,
          p.trust_score,
          p.identity_verified_at,
          p.badges,
          p.warning_count,
          p.admin_notes_count,
          p.is_admin,
          p.is_premium,
          p.created_at,
          p.last_active_at,
          (SELECT COUNT(*) FROM admin_user_flags f WHERE f.user_id = p.id AND f.is_resolved = false) as active_flags,
          (SELECT json_agg(f.flag_type) FROM admin_user_flags f WHERE f.user_id = p.id AND f.is_resolved = false) as flag_types
        FROM profiles p
        WHERE (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
          AND (p_status IS NULL OR p.account_status = p_status)
          AND (p_verified_only IS NULL OR (p_verified_only = true AND p.identity_verified_at IS NOT NULL) OR (p_verified_only = false AND p.identity_verified_at IS NULL))
          AND (p_flagged_only = false OR EXISTS (SELECT 1 FROM admin_user_flags f WHERE f.user_id = p.id AND f.is_resolved = false))
          AND (p_min_trust_score IS NULL OR p.trust_score >= p_min_trust_score)
          AND (p_max_trust_score IS NULL OR p.trust_score <= p_max_trust_score)
          AND (p_joined_from IS NULL OR p.created_at >= p_joined_from)
          AND (p_joined_to IS NULL OR p.created_at <= p_joined_to)
          AND (p_last_active_from IS NULL OR p.last_active_at >= p_last_active_from)
          AND (p_last_active_to IS NULL OR p.last_active_at <= p_last_active_to)
          AND (p_has_warnings IS NULL OR (p_has_warnings = true AND p.warning_count > 0) OR (p_has_warnings = false AND p.warning_count = 0))
        ORDER BY 
          CASE WHEN p_sort_order = 'asc' THEN
            CASE p_sort_by
              WHEN 'full_name' THEN p.full_name
              WHEN 'email' THEN p.email
              WHEN 'trust_score' THEN p.trust_score::text
              WHEN 'warning_count' THEN p.warning_count::text
              WHEN 'last_active_at' THEN COALESCE(p.last_active_at, '1970-01-01')::text
              ELSE p.created_at::text
            END
          END ASC,
          CASE WHEN p_sort_order = 'desc' OR p_sort_order IS NULL THEN
            CASE p_sort_by
              WHEN 'full_name' THEN p.full_name
              WHEN 'email' THEN p.email
              WHEN 'trust_score' THEN p.trust_score::text
              WHEN 'warning_count' THEN p.warning_count::text
              WHEN 'last_active_at' THEN COALESCE(p.last_active_at, '1970-01-01')::text
              ELSE p.created_at::text
            END
          END DESC
        LIMIT p_limit
        OFFSET p_offset
      ) t
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;

-- Get full user profile for admin
CREATE OR REPLACE FUNCTION admin_get_user_full(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'profile', (
      SELECT row_to_json(p)
      FROM (
        SELECT 
          pr.*,
          (SELECT full_name FROM profiles WHERE id = pr.suspended_by) as suspended_by_name,
          (SELECT full_name FROM profiles WHERE id = pr.identity_verified_by) as verified_by_name
        FROM profiles pr
        WHERE pr.id = p_user_id
      ) p
    ),
    'stats', json_build_object(
      'total_rides_posted', (SELECT COUNT(*) FROM rides WHERE driver_id = p_user_id),
      'total_rides_completed', (SELECT COUNT(*) FROM rides WHERE driver_id = p_user_id AND status = 'completed'),
      'total_bookings', (SELECT COUNT(*) FROM bookings WHERE passenger_id = p_user_id),
      'completed_bookings', (SELECT COUNT(*) FROM bookings WHERE passenger_id = p_user_id AND status = 'completed'),
      'cancelled_bookings', (SELECT COUNT(*) FROM bookings WHERE passenger_id = p_user_id AND status = 'cancelled'),
      'avg_rating_as_driver', (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'driver'),
      'avg_rating_as_passenger', (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE reviewee_id = p_user_id AND review_type = 'passenger'),
      'total_reviews_received', (SELECT COUNT(*) FROM reviews WHERE reviewee_id = p_user_id),
      'total_reviews_given', (SELECT COUNT(*) FROM reviews WHERE reviewer_id = p_user_id),
      'messages_sent', (SELECT COUNT(*) FROM messages WHERE sender_id = p_user_id),
      'reports_filed', (SELECT COUNT(*) FROM safety_reports WHERE reporter_id = p_user_id),
      'reports_against', (SELECT COUNT(*) FROM safety_reports WHERE reported_user_id = p_user_id),
      'community_posts', (SELECT COUNT(*) FROM community_posts WHERE author_id = p_user_id)
    ),
    'flags', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', f.id,
        'flag_type', f.flag_type,
        'reason', f.reason,
        'priority', f.priority,
        'is_resolved', f.is_resolved,
        'created_at', f.created_at,
        'flagged_by', (SELECT full_name FROM profiles WHERE id = f.flagged_by)
      )), '[]'::json)
      FROM admin_user_flags f
      WHERE f.user_id = p_user_id
      ORDER BY f.created_at DESC
      LIMIT 10
    ),
    'warnings', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', w.id,
        'warning_type', w.warning_type,
        'severity', w.severity,
        'title', w.title,
        'description', w.description,
        'is_acknowledged', w.is_acknowledged,
        'created_at', w.created_at,
        'issued_by', (SELECT full_name FROM profiles WHERE id = w.issued_by)
      )), '[]'::json)
      FROM user_warnings w
      WHERE w.user_id = p_user_id
      ORDER BY w.created_at DESC
      LIMIT 10
    ),
    'recent_actions', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', a.id,
        'action_type', a.action_type,
        'reason', a.reason,
        'action_details', a.action_details,
        'created_at', a.created_at,
        'performed_by', (SELECT full_name FROM profiles WHERE id = a.performed_by)
      )), '[]'::json)
      FROM user_account_actions a
      WHERE a.user_id = p_user_id
      ORDER BY a.created_at DESC
      LIMIT 20
    ),
    'verification_docs', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', d.id,
        'document_type', d.document_type,
        'status', d.status,
        'submitted_at', d.submitted_at,
        'reviewed_at', d.reviewed_at,
        'rejection_reason', d.rejection_reason
      )), '[]'::json)
      FROM verification_documents d
      WHERE d.user_id = p_user_id
      ORDER BY d.submitted_at DESC
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- =====================================================
-- 8. RPC FUNCTIONS - ACCOUNT ACTIONS
-- =====================================================

-- Suspend user
CREATE OR REPLACE FUNCTION admin_suspend_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT NULL, -- NULL = indefinite
  p_notify_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expires_at TIMESTAMPTZ;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Can't suspend yourself or other admins
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot suspend yourself';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Cannot suspend admin users';
  END IF;

  -- Calculate expiration
  IF p_duration_days IS NOT NULL THEN
    expires_at := now() + (p_duration_days || ' days')::INTERVAL;
  END IF;

  -- Update profile
  UPDATE profiles SET
    account_status = 'suspended',
    suspension_reason = p_reason,
    suspension_expires_at = expires_at,
    suspended_by = auth.uid()
  WHERE id = p_user_id;

  -- Log action
  INSERT INTO user_account_actions (user_id, action_type, reason, action_details, performed_by)
  VALUES (p_user_id, 'suspended', p_reason, json_build_object('duration_days', p_duration_days, 'expires_at', expires_at), auth.uid());

  -- Send notification if requested
  IF p_notify_user THEN
    INSERT INTO notifications (user_id, title, body, type, priority)
    VALUES (p_user_id, 'Account Suspended', 'Your account has been suspended. Reason: ' || p_reason, 'warning', 'high');
  END IF;

  RETURN json_build_object('success', true, 'expires_at', expires_at);
END;
$$;

-- Ban user (permanent)
CREATE OR REPLACE FUNCTION admin_ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_notify_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban yourself';
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Cannot ban admin users';
  END IF;

  -- Update profile
  UPDATE profiles SET
    account_status = 'banned',
    suspension_reason = p_reason,
    suspension_expires_at = NULL,
    suspended_by = auth.uid()
  WHERE id = p_user_id;

  -- Log action
  INSERT INTO user_account_actions (user_id, action_type, reason, performed_by)
  VALUES (p_user_id, 'banned', p_reason, auth.uid());

  -- Notify
  IF p_notify_user THEN
    INSERT INTO notifications (user_id, title, body, type, priority)
    VALUES (p_user_id, 'Account Banned', 'Your account has been permanently banned. Reason: ' || p_reason, 'error', 'urgent');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Reinstate user
CREATE OR REPLACE FUNCTION admin_reinstate_user(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_notify_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prev_status TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT account_status INTO prev_status FROM profiles WHERE id = p_user_id;

  -- Update profile
  UPDATE profiles SET
    account_status = 'active',
    suspension_reason = NULL,
    suspension_expires_at = NULL,
    suspended_by = NULL
  WHERE id = p_user_id;

  -- Log action
  INSERT INTO user_account_actions (user_id, action_type, reason, action_details, performed_by)
  VALUES (p_user_id, CASE prev_status WHEN 'banned' THEN 'unbanned' ELSE 'unsuspended' END, p_reason, json_build_object('previous_status', prev_status), auth.uid());

  -- Notify
  IF p_notify_user THEN
    INSERT INTO notifications (user_id, title, body, type, priority)
    VALUES (p_user_id, 'Account Reinstated', 'Your account has been reinstated. Welcome back!', 'success', 'normal');
  END IF;

  RETURN json_build_object('success', true, 'previous_status', prev_status);
END;
$$;

-- Issue warning to user
CREATE OR REPLACE FUNCTION admin_warn_user(
  p_user_id UUID,
  p_warning_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_notify_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_warning_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Insert warning
  INSERT INTO user_warnings (user_id, warning_type, severity, title, description, related_entity_type, related_entity_id, issued_by)
  VALUES (p_user_id, p_warning_type, p_severity, p_title, p_description, p_related_entity_type, p_related_entity_id, auth.uid())
  RETURNING id INTO new_warning_id;

  -- Update warning count
  UPDATE profiles SET warning_count = warning_count + 1 WHERE id = p_user_id;

  -- Log action
  INSERT INTO user_account_actions (user_id, action_type, reason, action_details, performed_by)
  VALUES (p_user_id, 'warned', p_title, json_build_object('warning_type', p_warning_type, 'severity', p_severity, 'warning_id', new_warning_id), auth.uid());

  -- Notify
  IF p_notify_user THEN
    INSERT INTO notifications (user_id, title, body, type, priority, link)
    VALUES (p_user_id, 'You have received a warning', p_title || ': ' || p_description, 'warning', 
      CASE p_severity WHEN 'final_warning' THEN 'urgent' WHEN 'warning' THEN 'high' ELSE 'normal' END,
      '/profile/warnings');
  END IF;

  RETURN json_build_object('success', true, 'warning_id', new_warning_id);
END;
$$;

-- Verify user identity
CREATE OR REPLACE FUNCTION admin_verify_user(
  p_user_id UUID,
  p_notify_user BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Update profile
  UPDATE profiles SET
    identity_verified_at = now(),
    identity_verified_by = auth.uid(),
    badges = array_append(badges, 'verified')
  WHERE id = p_user_id AND identity_verified_at IS NULL;

  -- Log action
  INSERT INTO user_account_actions (user_id, action_type, performed_by)
  VALUES (p_user_id, 'verified', auth.uid());

  -- Notify
  IF p_notify_user THEN
    INSERT INTO notifications (user_id, title, body, type, priority)
    VALUES (p_user_id, 'Identity Verified! ✓', 'Congratulations! Your identity has been verified. You now have a verified badge.', 'success', 'normal');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Update trust score
CREATE OR REPLACE FUNCTION admin_update_trust_score(
  p_user_id UUID,
  p_new_score INTEGER,
  p_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_score INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_new_score < 0 OR p_new_score > 100 THEN
    RAISE EXCEPTION 'Trust score must be between 0 and 100';
  END IF;

  SELECT trust_score INTO old_score FROM profiles WHERE id = p_user_id;

  UPDATE profiles SET trust_score = p_new_score WHERE id = p_user_id;

  INSERT INTO user_account_actions (user_id, action_type, reason, action_details, performed_by)
  VALUES (p_user_id, 'trust_score_adjusted', p_reason, json_build_object('old_score', old_score, 'new_score', p_new_score), auth.uid());

  RETURN json_build_object('success', true, 'old_score', old_score, 'new_score', p_new_score);
END;
$$;

-- =====================================================
-- 9. RPC FUNCTIONS - NOTES & FLAGS
-- =====================================================

-- Add note to user
CREATE OR REPLACE FUNCTION admin_add_user_note(
  p_user_id UUID,
  p_note TEXT,
  p_note_type TEXT DEFAULT 'general',
  p_is_pinned BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_note_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO admin_user_notes (user_id, note, note_type, is_pinned, created_by)
  VALUES (p_user_id, p_note, p_note_type, p_is_pinned, auth.uid())
  RETURNING id INTO new_note_id;

  UPDATE profiles SET admin_notes_count = admin_notes_count + 1 WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'note_id', new_note_id);
END;
$$;

-- Get user notes
CREATE OR REPLACE FUNCTION admin_get_user_notes(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT 
      n.*,
      json_build_object('id', p.id, 'full_name', p.full_name, 'avatar_url', p.avatar_url) as author
    FROM admin_user_notes n
    JOIN profiles p ON n.created_by = p.id
    WHERE n.user_id = p_user_id
    ORDER BY n.is_pinned DESC, n.created_at DESC
    LIMIT p_limit
  ) t;

  RETURN result;
END;
$$;

-- Delete note
CREATE OR REPLACE FUNCTION admin_delete_user_note(p_note_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  note_user_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT user_id INTO note_user_id FROM admin_user_notes WHERE id = p_note_id;

  DELETE FROM admin_user_notes WHERE id = p_note_id;

  IF note_user_id IS NOT NULL THEN
    UPDATE profiles SET admin_notes_count = GREATEST(admin_notes_count - 1, 0) WHERE id = note_user_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Flag user
CREATE OR REPLACE FUNCTION admin_flag_user(
  p_user_id UUID,
  p_flag_type TEXT,
  p_reason TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_flag_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO admin_user_flags (user_id, flag_type, reason, priority, flagged_by)
  VALUES (p_user_id, p_flag_type, p_reason, p_priority, auth.uid())
  ON CONFLICT (user_id, flag_type, is_resolved) WHERE is_resolved = false
  DO UPDATE SET reason = EXCLUDED.reason, priority = EXCLUDED.priority, flagged_by = EXCLUDED.flagged_by
  RETURNING id INTO new_flag_id;

  RETURN json_build_object('success', true, 'flag_id', new_flag_id);
END;
$$;

-- Resolve flag
CREATE OR REPLACE FUNCTION admin_resolve_flag(
  p_flag_id UUID,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE admin_user_flags SET
    is_resolved = true,
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_note = p_resolution_note
  WHERE id = p_flag_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Get flagged users
CREATE OR REPLACE FUNCTION admin_get_flagged_users(
  p_flag_type TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT 
      f.*,
      json_build_object('id', p.id, 'full_name', p.full_name, 'email', p.email, 'avatar_url', p.avatar_url, 'account_status', p.account_status) as user,
      json_build_object('id', fb.id, 'full_name', fb.full_name) as flagged_by_user
    FROM admin_user_flags f
    JOIN profiles p ON f.user_id = p.id
    JOIN profiles fb ON f.flagged_by = fb.id
    WHERE f.is_resolved = false
      AND (p_flag_type IS NULL OR f.flag_type = p_flag_type)
      AND (p_priority IS NULL OR f.priority = p_priority)
    ORDER BY 
      CASE f.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
      f.created_at DESC
    LIMIT p_limit
  ) t;

  RETURN result;
END;
$$;

-- =====================================================
-- 10. RPC FUNCTIONS - VERIFICATION QUEUE
-- =====================================================

-- Get verification queue
CREATE OR REPLACE FUNCTION admin_get_verification_queue(
  p_document_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'pending',
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO result
  FROM (
    SELECT 
      d.*,
      json_build_object(
        'id', p.id, 
        'full_name', p.full_name, 
        'email', p.email, 
        'avatar_url', p.avatar_url,
        'created_at', p.created_at,
        'identity_verified_at', p.identity_verified_at
      ) as user
    FROM verification_documents d
    JOIN profiles p ON d.user_id = p.id
    WHERE (p_document_type IS NULL OR d.document_type = p_document_type)
      AND (p_status IS NULL OR d.status = p_status)
    ORDER BY d.submitted_at ASC
    LIMIT p_limit
  ) t;

  RETURN result;
END;
$$;

-- Approve verification document
CREATE OR REPLACE FUNCTION admin_approve_verification(
  p_document_id UUID,
  p_verified_data JSONB DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_user_id UUID;
  doc_type TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT user_id, document_type INTO doc_user_id, doc_type
  FROM verification_documents WHERE id = p_document_id;

  UPDATE verification_documents SET
    status = 'approved',
    verified_data = p_verified_data,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = p_document_id;

  -- If ID document, verify user
  IF doc_type IN ('id_card', 'passport', 'drivers_license') THEN
    UPDATE profiles SET
      identity_verified_at = now(),
      identity_verified_by = auth.uid(),
      badges = array_append(badges, 'verified')
    WHERE id = doc_user_id AND identity_verified_at IS NULL;
  END IF;

  INSERT INTO user_account_actions (user_id, action_type, action_details, performed_by)
  VALUES (doc_user_id, 'verified', json_build_object('document_type', doc_type, 'document_id', p_document_id), auth.uid());

  -- Notify user
  INSERT INTO notifications (user_id, title, body, type)
  VALUES (doc_user_id, 'Document Approved', 'Your ' || replace(doc_type, '_', ' ') || ' has been verified.', 'success');

  RETURN json_build_object('success', true);
END;
$$;

-- Reject verification document
CREATE OR REPLACE FUNCTION admin_reject_verification(
  p_document_id UUID,
  p_rejection_reason TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  doc_user_id UUID;
  doc_type TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT user_id, document_type INTO doc_user_id, doc_type
  FROM verification_documents WHERE id = p_document_id;

  UPDATE verification_documents SET
    status = 'rejected',
    rejection_reason = p_rejection_reason,
    reviewed_at = now(),
    reviewed_by = auth.uid()
  WHERE id = p_document_id;

  -- Notify user
  INSERT INTO notifications (user_id, title, body, type, priority)
  VALUES (doc_user_id, 'Document Rejected', 'Your ' || replace(doc_type, '_', ' ') || ' was rejected: ' || p_rejection_reason, 'warning', 'high');

  RETURN json_build_object('success', true);
END;
$$;

-- =====================================================
-- 11. RPC FUNCTIONS - BADGES & PROFILE EDIT
-- =====================================================

-- Manage badges
CREATE OR REPLACE FUNCTION admin_manage_badge(
  p_user_id UUID,
  p_badge TEXT,
  p_action TEXT -- 'add' or 'remove'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_action = 'add' THEN
    UPDATE profiles SET badges = array_append(badges, p_badge)
    WHERE id = p_user_id AND NOT (p_badge = ANY(badges));
    
    INSERT INTO user_account_actions (user_id, action_type, action_details, performed_by)
    VALUES (p_user_id, 'badge_added', json_build_object('badge', p_badge), auth.uid());
  ELSIF p_action = 'remove' THEN
    UPDATE profiles SET badges = array_remove(badges, p_badge)
    WHERE id = p_user_id;
    
    INSERT INTO user_account_actions (user_id, action_type, action_details, performed_by)
    VALUES (p_user_id, 'badge_removed', json_build_object('badge', p_badge), auth.uid());
  ELSE
    RAISE EXCEPTION 'Invalid action. Use add or remove.';
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Admin edit user profile
CREATE OR REPLACE FUNCTION admin_edit_user_profile(
  p_user_id UUID,
  p_full_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_is_premium BOOLEAN DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  changes JSONB := '{}';
  old_profile RECORD;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get old values
  SELECT full_name, phone, bio, is_premium INTO old_profile
  FROM profiles WHERE id = p_user_id;

  -- Track changes
  IF p_full_name IS NOT NULL AND p_full_name != old_profile.full_name THEN
    changes := changes || json_build_object('full_name', json_build_object('old', old_profile.full_name, 'new', p_full_name))::jsonb;
  END IF;
  IF p_phone IS NOT NULL AND (p_phone != old_profile.phone OR old_profile.phone IS NULL) THEN
    changes := changes || json_build_object('phone', json_build_object('old', old_profile.phone, 'new', p_phone))::jsonb;
  END IF;
  IF p_is_premium IS NOT NULL AND p_is_premium != old_profile.is_premium THEN
    changes := changes || json_build_object('is_premium', json_build_object('old', old_profile.is_premium, 'new', p_is_premium))::jsonb;
  END IF;

  -- Update
  UPDATE profiles SET
    full_name = COALESCE(p_full_name, full_name),
    phone = COALESCE(p_phone, phone),
    bio = COALESCE(p_bio, bio),
    is_premium = COALESCE(p_is_premium, is_premium),
    updated_at = now()
  WHERE id = p_user_id;

  -- Log
  INSERT INTO user_account_actions (user_id, action_type, reason, action_details, performed_by)
  VALUES (p_user_id, 'profile_edited', p_reason, changes, auth.uid());

  RETURN json_build_object('success', true, 'changes', changes);
END;
$$;

-- =====================================================
-- 12. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE admin_user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_account_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_documents ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "admin_user_notes_admin_all" ON admin_user_notes
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "admin_user_flags_admin_all" ON admin_user_flags
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "user_account_actions_admin_all" ON user_account_actions
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "user_warnings_admin_read" ON user_warnings
  FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "user_warnings_admin_write" ON user_warnings
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "user_warnings_user_read" ON user_warnings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "verification_documents_admin_all" ON verification_documents
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "verification_documents_user_read" ON verification_documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "verification_documents_user_insert" ON verification_documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 13. GRANT EXECUTE PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION admin_get_user_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_search_users(TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_full(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_suspend_user(UUID, TEXT, INTEGER, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_ban_user(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reinstate_user(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_warn_user(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_user(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_trust_score(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_add_user_note(UUID, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_notes(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_user_note(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_flag_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_resolve_flag(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_flagged_users(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_verification_queue(TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_verification(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_verification(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_manage_badge(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_edit_user_profile(UUID, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;
