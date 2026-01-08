-- Phase 2: Admin Messaging & Communication Control
-- Created: 2026-01-07

-- =====================================================
-- 1. MESSAGE FLAGS TABLE (for reported/flagged messages)
-- =====================================================
CREATE TABLE IF NOT EXISTS message_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('spam', 'harassment', 'inappropriate', 'scam', 'other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, flagged_by)
);

CREATE INDEX IF NOT EXISTS idx_message_flags_message_id ON message_flags(message_id);
CREATE INDEX IF NOT EXISTS idx_message_flags_status ON message_flags(status);
CREATE INDEX IF NOT EXISTS idx_message_flags_created_at ON message_flags(created_at DESC);

-- RLS for message_flags
ALTER TABLE message_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all message flags" ON message_flags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can create flags" ON message_flags
  FOR INSERT WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Admins can update flags" ON message_flags
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 2. USER MUTES TABLE (for muted users)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  duration TEXT NOT NULL CHECK (duration IN ('1h', '24h', '7d', '30d', 'permanent')),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  unmuted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  unmuted_at TIMESTAMPTZ,
  unmute_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_mutes_user_id ON user_mutes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mutes_is_active ON user_mutes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_mutes_expires_at ON user_mutes(expires_at);

-- RLS for user_mutes
ALTER TABLE user_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all mutes" ON user_mutes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can create mutes" ON user_mutes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update mutes" ON user_mutes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 3. SYSTEM MESSAGES TABLE (admin broadcasts)
-- =====================================================
CREATE TABLE IF NOT EXISTS system_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'drivers', 'passengers', 'specific')),
  target_user_ids UUID[],
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'cancelled')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_messages_status ON system_messages(status);
CREATE INDEX IF NOT EXISTS idx_system_messages_scheduled_for ON system_messages(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_system_messages_sent_at ON system_messages(sent_at DESC);

-- RLS for system_messages
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system messages" ON system_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can create system messages" ON system_messages
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can update system messages" ON system_messages
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 4. ADMIN FUNCTIONS FOR MESSAGING
-- =====================================================

-- Check if user is muted
CREATE OR REPLACE FUNCTION is_user_muted(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_mutes
    WHERE user_id = p_user_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin view conversation (with audit logging)
CREATE OR REPLACE FUNCTION admin_view_conversation(
  p_conversation_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_conversation JSONB;
  v_messages JSONB;
  v_members JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get conversation
  SELECT jsonb_build_object(
    'id', c.id,
    'ride_id', c.ride_id,
    'created_at', c.created_at,
    'updated_at', c.updated_at
  ) INTO v_conversation
  FROM conversations c
  WHERE c.id = p_conversation_id;

  IF v_conversation IS NULL THEN
    RAISE EXCEPTION 'Conversation not found';
  END IF;

  -- Get members
  SELECT jsonb_agg(jsonb_build_object(
    'user_id', cm.user_id,
    'full_name', p.full_name,
    'email', p.email,
    'avatar_url', p.avatar_url,
    'is_muted', is_user_muted(cm.user_id)
  )) INTO v_members
  FROM conversation_members cm
  JOIN profiles p ON p.id = cm.user_id
  WHERE cm.conversation_id = p_conversation_id;

  -- Get messages
  SELECT jsonb_agg(jsonb_build_object(
    'id', m.id,
    'sender_id', m.sender_id,
    'sender_name', p.full_name,
    'body', m.body,
    'type', m.type,
    'created_at', m.created_at,
    'deleted_at', m.deleted_at,
    'is_flagged', EXISTS (SELECT 1 FROM message_flags WHERE message_id = m.id)
  ) ORDER BY m.created_at ASC) INTO v_messages
  FROM chat_messages m
  JOIN profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conversation_id;

  -- Log admin action
  PERFORM log_admin_action('conversation_view', 'conversation', p_conversation_id, 'Admin viewed conversation');

  RETURN jsonb_build_object(
    'conversation', v_conversation,
    'members', COALESCE(v_members, '[]'::jsonb),
    'messages', COALESCE(v_messages, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin delete message
CREATE OR REPLACE FUNCTION admin_delete_message(
  p_message_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get conversation ID for logging
  SELECT conversation_id INTO v_conversation_id FROM chat_messages WHERE id = p_message_id;

  IF v_conversation_id IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Soft delete the message
  UPDATE chat_messages
  SET deleted_at = NOW(), body = '[Message removed by admin]'
  WHERE id = p_message_id;

  -- Log admin action
  PERFORM log_admin_action('message_delete', 'message', p_message_id, p_reason,
    jsonb_build_object('conversation_id', v_conversation_id));

  RETURN jsonb_build_object('success', true, 'message_id', p_message_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin mute user
CREATE OR REPLACE FUNCTION admin_mute_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration TEXT
) RETURNS JSONB AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
  v_mute_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Calculate expiration
  v_expires_at := CASE p_duration
    WHEN '1h' THEN NOW() + INTERVAL '1 hour'
    WHEN '24h' THEN NOW() + INTERVAL '24 hours'
    WHEN '7d' THEN NOW() + INTERVAL '7 days'
    WHEN '30d' THEN NOW() + INTERVAL '30 days'
    WHEN 'permanent' THEN NULL
    ELSE NOW() + INTERVAL '24 hours'
  END;

  -- Deactivate any existing mutes
  UPDATE user_mutes SET is_active = false WHERE user_id = p_user_id AND is_active = true;

  -- Create new mute
  INSERT INTO user_mutes (user_id, muted_by, reason, duration, expires_at)
  VALUES (p_user_id, auth.uid(), p_reason, p_duration, v_expires_at)
  RETURNING id INTO v_mute_id;

  -- Log admin action
  PERFORM log_admin_action('user_mute', 'user', p_user_id, p_reason,
    jsonb_build_object('duration', p_duration, 'expires_at', v_expires_at));

  RETURN jsonb_build_object('success', true, 'mute_id', v_mute_id, 'expires_at', v_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin unmute user
CREATE OR REPLACE FUNCTION admin_unmute_user(
  p_user_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Deactivate mutes
  UPDATE user_mutes
  SET is_active = false, unmuted_by = auth.uid(), unmuted_at = NOW(), unmute_reason = p_reason
  WHERE user_id = p_user_id AND is_active = true;

  -- Log admin action
  PERFORM log_admin_action('user_unmute', 'user', p_user_id, p_reason);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin flag message
CREATE OR REPLACE FUNCTION admin_flag_message(
  p_message_id UUID,
  p_flag_type TEXT,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_flag_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Create flag
  INSERT INTO message_flags (message_id, flagged_by, flag_type, reason)
  VALUES (p_message_id, auth.uid(), p_flag_type, p_reason)
  ON CONFLICT (message_id, flagged_by) DO UPDATE
  SET flag_type = p_flag_type, reason = p_reason, status = 'pending', created_at = NOW()
  RETURNING id INTO v_flag_id;

  -- Log admin action
  PERFORM log_admin_action('message_flag', 'message', p_message_id, p_reason,
    jsonb_build_object('flag_type', p_flag_type));

  RETURN jsonb_build_object('success', true, 'flag_id', v_flag_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin resolve flag
CREATE OR REPLACE FUNCTION admin_resolve_flag(
  p_flag_id UUID,
  p_status TEXT,
  p_resolution_notes TEXT
) RETURNS JSONB AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get message ID
  SELECT message_id INTO v_message_id FROM message_flags WHERE id = p_flag_id;

  IF v_message_id IS NULL THEN
    RAISE EXCEPTION 'Flag not found';
  END IF;

  -- Update flag
  UPDATE message_flags
  SET status = p_status, resolved_by = auth.uid(), resolved_at = NOW(), resolution_notes = p_resolution_notes
  WHERE id = p_flag_id;

  -- Log admin action
  PERFORM log_admin_action('flag_resolve', 'flag', p_flag_id, p_resolution_notes,
    jsonb_build_object('new_status', p_status, 'message_id', v_message_id));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin send system message
CREATE OR REPLACE FUNCTION admin_send_system_message(
  p_title TEXT,
  p_content TEXT,
  p_target_audience TEXT,
  p_target_user_ids UUID[] DEFAULT NULL,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_message_id UUID;
  v_status TEXT;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Determine status
  v_status := CASE
    WHEN p_scheduled_for IS NOT NULL AND p_scheduled_for > NOW() THEN 'scheduled'
    ELSE 'sent'
  END;

  -- Create system message
  INSERT INTO system_messages (sent_by, title, content, target_audience, target_user_ids, scheduled_for, sent_at, status)
  VALUES (
    auth.uid(),
    p_title,
    p_content,
    p_target_audience,
    p_target_user_ids,
    p_scheduled_for,
    CASE WHEN v_status = 'sent' THEN NOW() ELSE NULL END,
    v_status
  )
  RETURNING id INTO v_message_id;

  -- If sending now, create notifications for target users
  IF v_status = 'sent' THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    SELECT
      p.id,
      'system',
      p_title,
      p_content,
      jsonb_build_object('system_message_id', v_message_id)
    FROM profiles p
    WHERE
      CASE p_target_audience
        WHEN 'all' THEN true
        WHEN 'drivers' THEN p.is_driver = true
        WHEN 'passengers' THEN p.is_driver = false OR p.is_driver IS NULL
        WHEN 'specific' THEN p.id = ANY(p_target_user_ids)
        ELSE false
      END;
  END IF;

  -- Log admin action
  PERFORM log_admin_action('system_message_send', 'system_message', v_message_id, 'System message sent',
    jsonb_build_object('target_audience', p_target_audience, 'status', v_status));

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id, 'status', v_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all conversations for admin
CREATE OR REPLACE FUNCTION admin_get_conversations(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_has_flags BOOLEAN DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_agg(conv ORDER BY conv->>'last_message_at' DESC NULLS LAST) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', c.id,
      'ride_id', c.ride_id,
      'created_at', c.created_at,
      'updated_at', c.updated_at,
      'members', (
        SELECT jsonb_agg(jsonb_build_object(
          'user_id', p.id,
          'full_name', p.full_name,
          'avatar_url', p.avatar_url
        ))
        FROM conversation_members cm
        JOIN profiles p ON p.id = cm.user_id
        WHERE cm.conversation_id = c.id
      ),
      'last_message', (
        SELECT jsonb_build_object(
          'body', m.body,
          'sender_name', p.full_name,
          'created_at', m.created_at
        )
        FROM chat_messages m
        JOIN profiles p ON p.id = m.sender_id
        WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC
        LIMIT 1
      ),
      'last_message_at', (
        SELECT MAX(created_at) FROM chat_messages WHERE conversation_id = c.id
      ),
      'message_count', (
        SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND deleted_at IS NULL
      ),
      'flag_count', (
        SELECT COUNT(*) FROM message_flags mf
        JOIN chat_messages m ON m.id = mf.message_id
        WHERE m.conversation_id = c.id AND mf.status = 'pending'
      )
    ) as conv
    FROM conversations c
    WHERE
      (p_search IS NULL OR EXISTS (
        SELECT 1 FROM conversation_members cm
        JOIN profiles p ON p.id = cm.user_id
        WHERE cm.conversation_id = c.id
        AND (p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
      ))
      AND (p_has_flags IS NULL OR (
        p_has_flags = true AND EXISTS (
          SELECT 1 FROM message_flags mf
          JOIN chat_messages m ON m.id = mf.message_id
          WHERE m.conversation_id = c.id AND mf.status = 'pending'
        )
      ))
    ORDER BY c.updated_at DESC NULLS LAST
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get flagged messages for admin
CREATE OR REPLACE FUNCTION admin_get_flagged_messages(
  p_status TEXT DEFAULT 'pending',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_agg(flag ORDER BY flag->>'created_at' DESC) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', mf.id,
      'message_id', mf.message_id,
      'flag_type', mf.flag_type,
      'reason', mf.reason,
      'status', mf.status,
      'created_at', mf.created_at,
      'flagged_by', jsonb_build_object(
        'id', fb.id,
        'full_name', fb.full_name
      ),
      'message', jsonb_build_object(
        'body', m.body,
        'sender_id', m.sender_id,
        'sender_name', sender.full_name,
        'conversation_id', m.conversation_id,
        'created_at', m.created_at
      ),
      'resolved_by', CASE WHEN mf.resolved_by IS NOT NULL THEN
        jsonb_build_object('id', rb.id, 'full_name', rb.full_name)
      ELSE NULL END,
      'resolved_at', mf.resolved_at,
      'resolution_notes', mf.resolution_notes
    ) as flag
    FROM message_flags mf
    JOIN chat_messages m ON m.id = mf.message_id
    JOIN profiles sender ON sender.id = m.sender_id
    JOIN profiles fb ON fb.id = mf.flagged_by
    LEFT JOIN profiles rb ON rb.id = mf.resolved_by
    WHERE (p_status = 'all' OR mf.status = p_status)
    ORDER BY mf.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get muted users for admin
CREATE OR REPLACE FUNCTION admin_get_muted_users(
  p_active_only BOOLEAN DEFAULT true,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_agg(mute ORDER BY mute->>'created_at' DESC) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', um.id,
      'user', jsonb_build_object(
        'id', u.id,
        'full_name', u.full_name,
        'email', u.email,
        'avatar_url', u.avatar_url
      ),
      'muted_by', jsonb_build_object(
        'id', mb.id,
        'full_name', mb.full_name
      ),
      'reason', um.reason,
      'duration', um.duration,
      'expires_at', um.expires_at,
      'is_active', um.is_active AND (um.expires_at IS NULL OR um.expires_at > NOW()),
      'created_at', um.created_at,
      'unmuted_by', CASE WHEN um.unmuted_by IS NOT NULL THEN
        jsonb_build_object('id', ub.id, 'full_name', ub.full_name)
      ELSE NULL END,
      'unmuted_at', um.unmuted_at,
      'unmute_reason', um.unmute_reason
    ) as mute
    FROM user_mutes um
    JOIN profiles u ON u.id = um.user_id
    JOIN profiles mb ON mb.id = um.muted_by
    LEFT JOIN profiles ub ON ub.id = um.unmuted_by
    WHERE (NOT p_active_only OR (um.is_active = true AND (um.expires_at IS NULL OR um.expires_at > NOW())))
    ORDER BY um.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Messaging stats for admin dashboard
CREATE OR REPLACE FUNCTION admin_get_messaging_stats()
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_conversations', (SELECT COUNT(*) FROM conversations),
    'total_messages', (SELECT COUNT(*) FROM chat_messages WHERE deleted_at IS NULL),
    'messages_today', (SELECT COUNT(*) FROM chat_messages WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL),
    'active_conversations_today', (SELECT COUNT(DISTINCT conversation_id) FROM chat_messages WHERE created_at > NOW() - INTERVAL '24 hours'),
    'pending_flags', (SELECT COUNT(*) FROM message_flags WHERE status = 'pending'),
    'flags_resolved_today', (SELECT COUNT(*) FROM message_flags WHERE resolved_at > NOW() - INTERVAL '24 hours'),
    'currently_muted', (SELECT COUNT(*) FROM user_mutes WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())),
    'messages_deleted_today', (SELECT COUNT(*) FROM chat_messages WHERE deleted_at > NOW() - INTERVAL '24 hours')
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
