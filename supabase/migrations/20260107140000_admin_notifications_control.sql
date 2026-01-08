-- Phase 4: Admin Notifications & Alerts Control
-- Full control over notification system, announcements, and templates

-- =====================================================
-- 1. ADMIN ANNOUNCEMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS admin_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  announcement_type TEXT NOT NULL DEFAULT 'info' CHECK (announcement_type IN ('info', 'warning', 'maintenance', 'feature', 'promotion')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'active', 'premium', 'new_users', 'inactive')),
  display_type TEXT NOT NULL DEFAULT 'notification' CHECK (display_type IN ('banner', 'modal', 'notification', 'push')),
  is_active BOOLEAN DEFAULT true,
  starts_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  view_count INTEGER DEFAULT 0,
  dismiss_count INTEGER DEFAULT 0
);

-- Index for active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_active ON admin_announcements(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON admin_announcements(announcement_type);

-- =====================================================
-- 2. NOTIFICATION TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('booking', 'ride', 'message', 'safety', 'community', 'promotional', 'system', 'general')),
  title_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  variables JSONB DEFAULT '[]'::jsonb, -- List of available variables
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  usage_count INTEGER DEFAULT 0
);

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_templates_slug ON notification_templates(slug);
CREATE INDEX IF NOT EXISTS idx_templates_category ON notification_templates(category);

-- =====================================================
-- 3. NOTIFICATION LOGS TABLE (Enhanced tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  user_id UUID REFERENCES profiles(id),
  title TEXT NOT NULL,
  body TEXT,
  notification_type TEXT NOT NULL,
  channel TEXT DEFAULT 'in_app' CHECK (channel IN ('in_app', 'push', 'email', 'sms')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
  announcement_id UUID REFERENCES admin_announcements(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES profiles(id), -- Admin who sent it (null for system)
  is_system BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

-- Indexes for notification logs
CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);

-- =====================================================
-- 4. NOTIFICATION PREFERENCES OVERRIDE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL,
  reason TEXT,
  overridden_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, notification_type)
);

-- =====================================================
-- 5. ADD COLUMNS TO EXISTING NOTIFICATIONS TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'sent_by') THEN
    ALTER TABLE notifications ADD COLUMN sent_by UUID REFERENCES profiles(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_system') THEN
    ALTER TABLE notifications ADD COLUMN is_system BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'priority') THEN
    ALTER TABLE notifications ADD COLUMN priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
    ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'announcement_id') THEN
    ALTER TABLE notifications ADD COLUMN announcement_id UUID REFERENCES admin_announcements(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- 6. RPC FUNCTIONS
-- =====================================================

-- Get notification statistics
CREATE OR REPLACE FUNCTION admin_get_notification_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'total_notifications', (SELECT COUNT(*) FROM notifications),
    'sent_today', (SELECT COUNT(*) FROM notifications WHERE created_at >= CURRENT_DATE),
    'sent_this_week', (SELECT COUNT(*) FROM notifications WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'),
    'unread_count', (SELECT COUNT(*) FROM notifications WHERE is_read = false),
    'read_rate', (
      SELECT COALESCE(
        ROUND((COUNT(*) FILTER (WHERE is_read = true)::numeric / NULLIF(COUNT(*)::numeric, 0)) * 100, 1),
        0
      )
      FROM notifications
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    'by_type', (
      SELECT json_object_agg(type, cnt)
      FROM (
        SELECT type, COUNT(*) as cnt
        FROM notifications
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY type
      ) t
    ),
    'active_announcements', (SELECT COUNT(*) FROM admin_announcements WHERE is_active = true AND (expires_at IS NULL OR expires_at > now())),
    'templates_count', (SELECT COUNT(*) FROM notification_templates WHERE is_active = true),
    'failed_notifications', (SELECT COUNT(*) FROM notification_logs WHERE status = 'failed' AND sent_at >= CURRENT_DATE - INTERVAL '7 days')
  ) INTO result;

  RETURN result;
END;
$$;

-- Get notifications with filters
CREATE OR REPLACE FUNCTION admin_get_notifications(
  p_search TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT 
      n.id,
      n.user_id,
      n.title,
      n.body,
      n.type,
      n.is_read,
      n.priority,
      n.is_system,
      n.created_at,
      n.expires_at,
      json_build_object(
        'id', p.id,
        'full_name', p.full_name,
        'email', p.email,
        'avatar_url', p.avatar_url
      ) as recipient,
      CASE WHEN n.sent_by IS NOT NULL THEN
        json_build_object(
          'id', s.id,
          'full_name', s.full_name
        )
      ELSE NULL END as sent_by
    FROM notifications n
    JOIN profiles p ON n.user_id = p.id
    LEFT JOIN profiles s ON n.sent_by = s.id
    WHERE (p_search IS NULL OR n.title ILIKE '%' || p_search || '%' OR n.body ILIKE '%' || p_search || '%' OR p.full_name ILIKE '%' || p_search || '%')
      AND (p_type IS NULL OR n.type = p_type)
      AND (p_status IS NULL OR (p_status = 'read' AND n.is_read = true) OR (p_status = 'unread' AND n.is_read = false))
      AND (p_priority IS NULL OR n.priority = p_priority)
      AND (p_user_id IS NULL OR n.user_id = p_user_id)
      AND (p_date_from IS NULL OR n.created_at >= p_date_from)
      AND (p_date_to IS NULL OR n.created_at <= p_date_to)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- View single notification
CREATE OR REPLACE FUNCTION admin_view_notification(p_notification_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'id', n.id,
    'user_id', n.user_id,
    'title', n.title,
    'body', n.body,
    'type', n.type,
    'link', n.link,
    'is_read', n.is_read,
    'priority', n.priority,
    'is_system', n.is_system,
    'created_at', n.created_at,
    'expires_at', n.expires_at,
    'announcement_id', n.announcement_id,
    'recipient', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email,
      'avatar_url', p.avatar_url,
      'phone', p.phone
    ),
    'sent_by', CASE WHEN n.sent_by IS NOT NULL THEN
      json_build_object('id', s.id, 'full_name', s.full_name)
    ELSE NULL END,
    'logs', (
      SELECT json_agg(json_build_object(
        'id', l.id,
        'channel', l.channel,
        'status', l.status,
        'sent_at', l.sent_at,
        'delivered_at', l.delivered_at,
        'read_at', l.read_at,
        'error_message', l.error_message
      ))
      FROM notification_logs l
      WHERE l.notification_id = n.id
    )
  )
  INTO result
  FROM notifications n
  JOIN profiles p ON n.user_id = p.id
  LEFT JOIN profiles s ON n.sent_by = s.id
  WHERE n.id = p_notification_id;

  RETURN result;
END;
$$;

-- Delete notification
CREATE OR REPLACE FUNCTION admin_delete_notification(p_notification_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM notifications WHERE id = p_notification_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Bulk delete notifications
CREATE OR REPLACE FUNCTION admin_bulk_delete_notifications(
  p_older_than TIMESTAMPTZ DEFAULT NULL,
  p_read_only BOOLEAN DEFAULT false,
  p_type TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM notifications
  WHERE (p_older_than IS NULL OR created_at < p_older_than)
    AND (p_read_only = false OR is_read = true)
    AND (p_type IS NULL OR type = p_type);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'deleted_count', deleted_count);
END;
$$;

-- Send notification to single user
CREATE OR REPLACE FUNCTION admin_send_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_notification_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, title, body, type, link, priority, expires_at, sent_by, is_system)
  VALUES (p_user_id, p_title, p_body, p_type, p_link, p_priority, p_expires_at, auth.uid(), false)
  RETURNING id INTO new_notification_id;

  -- Log the notification
  INSERT INTO notification_logs (notification_id, user_id, title, body, notification_type, priority, sent_by, status)
  VALUES (new_notification_id, p_user_id, p_title, p_body, p_type, p_priority, auth.uid(), 'sent');

  RETURN json_build_object('success', true, 'notification_id', new_notification_id);
END;
$$;

-- Send bulk notifications
CREATE OR REPLACE FUNCTION admin_send_bulk_notification(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal',
  p_target_audience TEXT DEFAULT 'all', -- all, active, premium, new_users
  p_user_ids UUID[] DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sent_count INTEGER := 0;
  target_users UUID[];
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get target users
  IF p_user_ids IS NOT NULL AND array_length(p_user_ids, 1) > 0 THEN
    target_users := p_user_ids;
  ELSE
    SELECT array_agg(id) INTO target_users
    FROM profiles
    WHERE CASE p_target_audience
      WHEN 'all' THEN true
      WHEN 'active' THEN last_active_at >= now() - INTERVAL '7 days'
      WHEN 'premium' THEN is_premium = true
      WHEN 'new_users' THEN created_at >= now() - INTERVAL '30 days'
      WHEN 'inactive' THEN last_active_at < now() - INTERVAL '30 days'
      ELSE true
    END;
  END IF;

  -- Send notifications
  IF target_users IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, type, link, priority, expires_at, sent_by, is_system)
    SELECT 
      unnest(target_users),
      p_title,
      p_body,
      p_type,
      p_link,
      p_priority,
      p_expires_at,
      auth.uid(),
      true;

    sent_count := array_length(target_users, 1);

    -- Log bulk send
    INSERT INTO notification_logs (user_id, title, body, notification_type, priority, sent_by, is_system, status, metadata)
    SELECT 
      unnest(target_users),
      p_title,
      p_body,
      p_type,
      p_priority,
      auth.uid(),
      true,
      'sent',
      json_build_object('bulk_send', true, 'target_audience', p_target_audience);
  END IF;

  RETURN json_build_object('success', true, 'sent_count', sent_count);
END;
$$;

-- =====================================================
-- ANNOUNCEMENT FUNCTIONS
-- =====================================================

-- Create announcement
CREATE OR REPLACE FUNCTION admin_create_announcement(
  p_title TEXT,
  p_body TEXT,
  p_type TEXT DEFAULT 'info',
  p_priority TEXT DEFAULT 'normal',
  p_target_audience TEXT DEFAULT 'all',
  p_display_type TEXT DEFAULT 'notification',
  p_starts_at TIMESTAMPTZ DEFAULT now(),
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO admin_announcements (title, body, announcement_type, priority, target_audience, display_type, starts_at, expires_at, created_by)
  VALUES (p_title, p_body, p_type, p_priority, p_target_audience, p_display_type, p_starts_at, p_expires_at, auth.uid())
  RETURNING id INTO new_id;

  RETURN json_build_object('success', true, 'announcement_id', new_id);
END;
$$;

-- Get announcements
CREATE OR REPLACE FUNCTION admin_get_announcements(
  p_active_only BOOLEAN DEFAULT false,
  p_type TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT 
      a.*,
      json_build_object('id', p.id, 'full_name', p.full_name) as created_by_user
    FROM admin_announcements a
    LEFT JOIN profiles p ON a.created_by = p.id
    WHERE (p_active_only = false OR (a.is_active = true AND (a.expires_at IS NULL OR a.expires_at > now())))
      AND (p_type IS NULL OR a.announcement_type = p_type)
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Update announcement
CREATE OR REPLACE FUNCTION admin_update_announcement(
  p_announcement_id UUID,
  p_title TEXT DEFAULT NULL,
  p_body TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_target_audience TEXT DEFAULT NULL,
  p_display_type TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE admin_announcements SET
    title = COALESCE(p_title, title),
    body = COALESCE(p_body, body),
    announcement_type = COALESCE(p_type, announcement_type),
    priority = COALESCE(p_priority, priority),
    target_audience = COALESCE(p_target_audience, target_audience),
    display_type = COALESCE(p_display_type, display_type),
    is_active = COALESCE(p_is_active, is_active),
    expires_at = COALESCE(p_expires_at, expires_at),
    updated_at = now()
  WHERE id = p_announcement_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Delete announcement
CREATE OR REPLACE FUNCTION admin_delete_announcement(p_announcement_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM admin_announcements WHERE id = p_announcement_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Broadcast announcement as notifications
CREATE OR REPLACE FUNCTION admin_broadcast_announcement(p_announcement_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  ann RECORD;
  sent_count INTEGER := 0;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get announcement
  SELECT * INTO ann FROM admin_announcements WHERE id = p_announcement_id;
  
  IF ann IS NULL THEN
    RAISE EXCEPTION 'Announcement not found';
  END IF;

  -- Send to target audience
  INSERT INTO notifications (user_id, title, body, type, priority, expires_at, announcement_id, is_system)
  SELECT 
    p.id,
    ann.title,
    ann.body,
    ann.announcement_type,
    ann.priority,
    ann.expires_at,
    ann.id,
    true
  FROM profiles p
  WHERE CASE ann.target_audience
    WHEN 'all' THEN true
    WHEN 'active' THEN p.last_active_at >= now() - INTERVAL '7 days'
    WHEN 'premium' THEN p.is_premium = true
    WHEN 'new_users' THEN p.created_at >= now() - INTERVAL '30 days'
    WHEN 'inactive' THEN p.last_active_at < now() - INTERVAL '30 days'
    ELSE true
  END;

  GET DIAGNOSTICS sent_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'sent_count', sent_count);
END;
$$;

-- =====================================================
-- TEMPLATE FUNCTIONS
-- =====================================================

-- Get templates
CREATE OR REPLACE FUNCTION admin_get_notification_templates(
  p_category TEXT DEFAULT NULL,
  p_active_only BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_agg(row_to_json(t))
  INTO result
  FROM (
    SELECT 
      nt.*,
      json_build_object('id', p.id, 'full_name', p.full_name) as created_by_user
    FROM notification_templates nt
    LEFT JOIN profiles p ON nt.created_by = p.id
    WHERE (p_category IS NULL OR nt.category = p_category)
      AND (p_active_only = false OR nt.is_active = true)
    ORDER BY nt.category, nt.name
  ) t;

  RETURN COALESCE(result, '[]'::json);
END;
$$;

-- Create template
CREATE OR REPLACE FUNCTION admin_create_notification_template(
  p_name TEXT,
  p_slug TEXT,
  p_category TEXT,
  p_title_template TEXT,
  p_body_template TEXT,
  p_notification_type TEXT DEFAULT 'info',
  p_variables JSONB DEFAULT '[]'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO notification_templates (name, slug, category, title_template, body_template, notification_type, variables, created_by)
  VALUES (p_name, p_slug, p_category, p_title_template, p_body_template, p_notification_type, p_variables, auth.uid())
  RETURNING id INTO new_id;

  RETURN json_build_object('success', true, 'template_id', new_id);
END;
$$;

-- Update template
CREATE OR REPLACE FUNCTION admin_update_notification_template(
  p_template_id UUID,
  p_name TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_title_template TEXT DEFAULT NULL,
  p_body_template TEXT DEFAULT NULL,
  p_notification_type TEXT DEFAULT NULL,
  p_variables JSONB DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  UPDATE notification_templates SET
    name = COALESCE(p_name, name),
    category = COALESCE(p_category, category),
    title_template = COALESCE(p_title_template, title_template),
    body_template = COALESCE(p_body_template, body_template),
    notification_type = COALESCE(p_notification_type, notification_type),
    variables = COALESCE(p_variables, variables),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_template_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Delete template
CREATE OR REPLACE FUNCTION admin_delete_notification_template(p_template_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM notification_templates WHERE id = p_template_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Send notification from template
CREATE OR REPLACE FUNCTION admin_send_from_template(
  p_template_slug TEXT,
  p_user_id UUID,
  p_variables JSONB DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tmpl RECORD;
  final_title TEXT;
  final_body TEXT;
  new_notification_id UUID;
  var_key TEXT;
  var_value TEXT;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Get template
  SELECT * INTO tmpl FROM notification_templates WHERE slug = p_template_slug AND is_active = true;
  
  IF tmpl IS NULL THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;

  -- Replace variables
  final_title := tmpl.title_template;
  final_body := tmpl.body_template;

  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    final_title := replace(final_title, '{{' || var_key || '}}', var_value);
    final_body := replace(final_body, '{{' || var_key || '}}', var_value);
  END LOOP;

  -- Insert notification
  INSERT INTO notifications (user_id, title, body, type, sent_by)
  VALUES (p_user_id, final_title, final_body, tmpl.notification_type, auth.uid())
  RETURNING id INTO new_notification_id;

  -- Update usage count
  UPDATE notification_templates SET usage_count = usage_count + 1 WHERE id = tmpl.id;

  -- Log
  INSERT INTO notification_logs (notification_id, user_id, title, body, notification_type, template_id, sent_by, status)
  VALUES (new_notification_id, p_user_id, final_title, final_body, tmpl.notification_type, tmpl.id, auth.uid(), 'sent');

  RETURN json_build_object('success', true, 'notification_id', new_notification_id);
END;
$$;

-- =====================================================
-- PREFERENCE OVERRIDE FUNCTIONS
-- =====================================================

-- Get user notification preferences (with overrides)
CREATE OR REPLACE FUNCTION admin_get_user_notification_prefs(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT json_build_object(
    'user', (SELECT row_to_json(p) FROM (SELECT id, full_name, email FROM profiles WHERE id = p_user_id) p),
    'preferences', (SELECT row_to_json(up) FROM user_preferences up WHERE user_id = p_user_id),
    'overrides', (
      SELECT json_agg(row_to_json(o))
      FROM notification_preferences_override o
      WHERE o.user_id = p_user_id
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Override user notification preference
CREATE OR REPLACE FUNCTION admin_override_notification_pref(
  p_user_id UUID,
  p_notification_type TEXT,
  p_is_enabled BOOLEAN,
  p_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  INSERT INTO notification_preferences_override (user_id, notification_type, is_enabled, reason, overridden_by, expires_at)
  VALUES (p_user_id, p_notification_type, p_is_enabled, p_reason, auth.uid(), p_expires_at)
  ON CONFLICT (user_id, notification_type) 
  DO UPDATE SET
    is_enabled = EXCLUDED.is_enabled,
    reason = EXCLUDED.reason,
    overridden_by = EXCLUDED.overridden_by,
    expires_at = EXCLUDED.expires_at,
    created_at = now();

  RETURN json_build_object('success', true);
END;
$$;

-- Remove override
CREATE OR REPLACE FUNCTION admin_remove_notification_override(p_user_id UUID, p_notification_type TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  DELETE FROM notification_preferences_override 
  WHERE user_id = p_user_id AND notification_type = p_notification_type;

  RETURN json_build_object('success', true);
END;
$$;

-- =====================================================
-- 7. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE admin_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences_override ENABLE ROW LEVEL SECURITY;

-- Admin policies
CREATE POLICY "admin_announcements_admin_all" ON admin_announcements
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "notification_templates_admin_all" ON notification_templates
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "notification_logs_admin_all" ON notification_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "notification_prefs_override_admin_all" ON notification_preferences_override
  FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- =====================================================
-- 8. INSERT DEFAULT TEMPLATES
-- =====================================================
INSERT INTO notification_templates (name, slug, category, title_template, body_template, notification_type, variables) VALUES
  ('Booking Confirmed', 'booking-confirmed', 'booking', 'Booking Confirmed!', 'Your booking for {{ride_date}} has been confirmed. Driver: {{driver_name}}', 'success', '["ride_date", "driver_name"]'),
  ('Booking Cancelled', 'booking-cancelled', 'booking', 'Booking Cancelled', 'Your booking {{booking_id}} has been cancelled. Reason: {{reason}}', 'warning', '["booking_id", "reason"]'),
  ('Ride Reminder', 'ride-reminder', 'ride', 'Ride Tomorrow!', 'Reminder: You have a ride scheduled for {{ride_date}} at {{ride_time}}', 'info', '["ride_date", "ride_time"]'),
  ('New Message', 'new-message', 'message', 'New Message', '{{sender_name}} sent you a message', 'info', '["sender_name"]'),
  ('Safety Alert', 'safety-alert', 'safety', 'Safety Notice', '{{alert_message}}', 'warning', '["alert_message"]'),
  ('Welcome', 'welcome', 'system', 'Welcome to CarpoolNetwork!', 'Hi {{user_name}}, welcome aboard! Start by finding or posting your first ride.', 'success', '["user_name"]'),
  ('Account Verified', 'account-verified', 'system', 'Account Verified', 'Congratulations {{user_name}}! Your account has been verified.', 'success', '["user_name"]')
ON CONFLICT (slug) DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_notification_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_notifications(TEXT, TEXT, TEXT, TEXT, UUID, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_view_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_notification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_bulk_delete_notifications(TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_send_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_send_bulk_notification(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_announcement(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_announcements(BOOLEAN, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_announcement(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_announcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_broadcast_announcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_notification_templates(TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_create_notification_template(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_notification_template(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_notification_template(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_send_from_template(TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_user_notification_prefs(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_override_notification_pref(UUID, TEXT, BOOLEAN, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_notification_override(UUID, TEXT) TO authenticated;
