-- Phase 3: Admin Community & Content Moderation
-- Created: 2026-01-07

-- =====================================================
-- 1. POST FLAGS TABLE (for reported posts)
-- =====================================================
CREATE TABLE IF NOT EXISTS post_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'off_topic', 'other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, flagged_by)
);

CREATE INDEX IF NOT EXISTS idx_post_flags_post_id ON post_flags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_flags_status ON post_flags(status);
CREATE INDEX IF NOT EXISTS idx_post_flags_created_at ON post_flags(created_at DESC);

-- RLS for post_flags
ALTER TABLE post_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all post flags" ON post_flags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can create post flags" ON post_flags
  FOR INSERT WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Admins can update post flags" ON post_flags
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 2. COMMENT FLAGS TABLE (for reported comments)
-- =====================================================
CREATE TABLE IF NOT EXISTS comment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
  flagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'off_topic', 'other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, flagged_by)
);

CREATE INDEX IF NOT EXISTS idx_comment_flags_comment_id ON comment_flags(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_flags_status ON comment_flags(status);
CREATE INDEX IF NOT EXISTS idx_comment_flags_created_at ON comment_flags(created_at DESC);

-- RLS for comment_flags
ALTER TABLE comment_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all comment flags" ON comment_flags
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can create comment flags" ON comment_flags
  FOR INSERT WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Admins can update comment flags" ON comment_flags
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 3. CONTENT WARNINGS TABLE (warnings issued to users)
-- =====================================================
CREATE TABLE IF NOT EXISTS content_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  warning_type TEXT NOT NULL CHECK (warning_type IN ('first_warning', 'second_warning', 'final_warning')),
  reason TEXT NOT NULL,
  related_post_id UUID REFERENCES community_posts(id) ON DELETE SET NULL,
  related_comment_id UUID REFERENCES community_comments(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_warnings_user_id ON content_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_content_warnings_created_at ON content_warnings(created_at DESC);

-- RLS for content_warnings
ALTER TABLE content_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all content warnings" ON content_warnings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can view own warnings" ON content_warnings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can create content warnings" ON content_warnings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Users can acknowledge own warnings" ON content_warnings
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND acknowledged_at IS NOT NULL);

-- =====================================================
-- 4. BANNED WORDS TABLE (auto-moderation)
-- =====================================================
CREATE TABLE IF NOT EXISTS banned_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  severity TEXT NOT NULL DEFAULT 'flag' CHECK (severity IN ('flag', 'block', 'shadow_block')),
  added_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banned_words_word ON banned_words(word);
CREATE INDEX IF NOT EXISTS idx_banned_words_active ON banned_words(is_active) WHERE is_active = true;

-- RLS for banned_words
ALTER TABLE banned_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage banned words" ON banned_words
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =====================================================
-- 5. ADD COLUMNS TO EXISTING TABLES
-- =====================================================

-- Add hidden_at and hidden_by to community_posts (soft hide)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS hide_reason TEXT;

-- Add hidden_at and hidden_by to community_comments (soft hide)
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS hidden_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS hide_reason TEXT;

-- =====================================================
-- 6. ADMIN FUNCTIONS FOR COMMUNITY MODERATION
-- =====================================================

-- Get community stats for admin dashboard
CREATE OR REPLACE FUNCTION admin_get_community_stats()
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_posts', (SELECT COUNT(*) FROM community_posts WHERE hidden_at IS NULL),
    'total_comments', (SELECT COUNT(*) FROM community_comments WHERE hidden_at IS NULL),
    'posts_today', (SELECT COUNT(*) FROM community_posts WHERE created_at > NOW() - INTERVAL '24 hours' AND hidden_at IS NULL),
    'comments_today', (SELECT COUNT(*) FROM community_comments WHERE created_at > NOW() - INTERVAL '24 hours' AND hidden_at IS NULL),
    'pending_post_flags', (SELECT COUNT(*) FROM post_flags WHERE status = 'pending'),
    'pending_comment_flags', (SELECT COUNT(*) FROM comment_flags WHERE status = 'pending'),
    'flags_resolved_today', (
      SELECT COUNT(*) FROM (
        SELECT id FROM post_flags WHERE resolved_at > NOW() - INTERVAL '24 hours'
        UNION ALL
        SELECT id FROM comment_flags WHERE resolved_at > NOW() - INTERVAL '24 hours'
      ) sub
    ),
    'warnings_this_week', (SELECT COUNT(*) FROM content_warnings WHERE created_at > NOW() - INTERVAL '7 days'),
    'pinned_posts', (SELECT COUNT(*) FROM community_posts WHERE is_pinned = true AND hidden_at IS NULL),
    'locked_posts', (SELECT COUNT(*) FROM community_posts WHERE is_locked = true AND hidden_at IS NULL),
    'hidden_posts', (SELECT COUNT(*) FROM community_posts WHERE hidden_at IS NOT NULL),
    'hidden_comments', (SELECT COUNT(*) FROM community_comments WHERE hidden_at IS NOT NULL)
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get posts for admin with filters
CREATE OR REPLACE FUNCTION admin_get_posts(
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0,
  p_search TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_has_flags BOOLEAN DEFAULT NULL,
  p_is_pinned BOOLEAN DEFAULT NULL,
  p_is_locked BOOLEAN DEFAULT NULL,
  p_is_hidden BOOLEAN DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_agg(post ORDER BY post->>'created_at' DESC) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'body', LEFT(p.body, 200),
      'category', p.category,
      'is_pinned', p.is_pinned,
      'is_locked', p.is_locked,
      'hidden_at', p.hidden_at,
      'hide_reason', p.hide_reason,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'author', jsonb_build_object(
        'id', a.id,
        'full_name', a.full_name,
        'avatar_url', a.avatar_url
      ),
      'stats', jsonb_build_object(
        'likes', (SELECT COALESCE(SUM(vote), 0) FROM community_post_votes WHERE post_id = p.id AND vote = 1),
        'dislikes', (SELECT COALESCE(ABS(SUM(vote)), 0) FROM community_post_votes WHERE post_id = p.id AND vote = -1),
        'comments', (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id AND hidden_at IS NULL)
      ),
      'flag_count', (SELECT COUNT(*) FROM post_flags WHERE post_id = p.id AND status = 'pending')
    ) as post
    FROM community_posts p
    JOIN profiles a ON a.id = p.author_id
    WHERE
      (p_search IS NULL OR p.title ILIKE '%' || p_search || '%' OR p.body ILIKE '%' || p_search || '%')
      AND (p_category IS NULL OR p.category = p_category)
      AND (p_has_flags IS NULL OR (
        p_has_flags = true AND EXISTS (SELECT 1 FROM post_flags WHERE post_id = p.id AND status = 'pending')
      ) OR (
        p_has_flags = false AND NOT EXISTS (SELECT 1 FROM post_flags WHERE post_id = p.id AND status = 'pending')
      ))
      AND (p_is_pinned IS NULL OR p.is_pinned = p_is_pinned)
      AND (p_is_locked IS NULL OR p.is_locked = p_is_locked)
      AND (p_is_hidden IS NULL OR (p_is_hidden = true AND p.hidden_at IS NOT NULL) OR (p_is_hidden = false AND p.hidden_at IS NULL))
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View single post with all details for admin
CREATE OR REPLACE FUNCTION admin_view_post(p_post_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'body', p.body,
    'category', p.category,
    'is_pinned', p.is_pinned,
    'is_locked', p.is_locked,
    'hidden_at', p.hidden_at,
    'hidden_by', p.hidden_by,
    'hide_reason', p.hide_reason,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'author', jsonb_build_object(
      'id', a.id,
      'full_name', a.full_name,
      'email', a.email,
      'avatar_url', a.avatar_url
    ),
    'stats', jsonb_build_object(
      'likes', (SELECT COALESCE(SUM(vote), 0) FROM community_post_votes WHERE post_id = p.id AND vote = 1),
      'dislikes', (SELECT COALESCE(ABS(SUM(vote)), 0) FROM community_post_votes WHERE post_id = p.id AND vote = -1),
      'comments', (SELECT COUNT(*) FROM community_comments WHERE post_id = p.id)
    ),
    'flags', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', pf.id,
        'flag_type', pf.flag_type,
        'reason', pf.reason,
        'status', pf.status,
        'created_at', pf.created_at,
        'flagged_by', jsonb_build_object('id', fb.id, 'full_name', fb.full_name),
        'resolved_by', CASE WHEN pf.resolved_by IS NOT NULL THEN
          jsonb_build_object('id', rb.id, 'full_name', rb.full_name)
        ELSE NULL END,
        'resolved_at', pf.resolved_at,
        'resolution_notes', pf.resolution_notes
      ) ORDER BY pf.created_at DESC), '[]'::jsonb)
      FROM post_flags pf
      JOIN profiles fb ON fb.id = pf.flagged_by
      LEFT JOIN profiles rb ON rb.id = pf.resolved_by
      WHERE pf.post_id = p.id
    ),
    'comments', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', c.id,
        'body', c.body,
        'hidden_at', c.hidden_at,
        'hide_reason', c.hide_reason,
        'created_at', c.created_at,
        'author', jsonb_build_object('id', ca.id, 'full_name', ca.full_name, 'avatar_url', ca.avatar_url),
        'flag_count', (SELECT COUNT(*) FROM comment_flags WHERE comment_id = c.id AND status = 'pending')
      ) ORDER BY c.created_at ASC), '[]'::jsonb)
      FROM community_comments c
      JOIN profiles ca ON ca.id = c.author_id
      WHERE c.post_id = p.id
    )
  ) INTO v_result
  FROM community_posts p
  JOIN profiles a ON a.id = p.author_id
  WHERE p.id = p_post_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Log admin action
  PERFORM log_admin_action('post_view', 'post', p_post_id, 'Admin viewed post');

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get flagged posts for admin
CREATE OR REPLACE FUNCTION admin_get_flagged_posts(
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
      'id', pf.id,
      'post_id', pf.post_id,
      'flag_type', pf.flag_type,
      'reason', pf.reason,
      'status', pf.status,
      'created_at', pf.created_at,
      'flagged_by', jsonb_build_object('id', fb.id, 'full_name', fb.full_name),
      'post', jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'body', LEFT(p.body, 200),
        'author', jsonb_build_object('id', a.id, 'full_name', a.full_name)
      ),
      'resolved_by', CASE WHEN pf.resolved_by IS NOT NULL THEN
        jsonb_build_object('id', rb.id, 'full_name', rb.full_name)
      ELSE NULL END,
      'resolved_at', pf.resolved_at,
      'resolution_notes', pf.resolution_notes
    ) as flag
    FROM post_flags pf
    JOIN community_posts p ON p.id = pf.post_id
    JOIN profiles a ON a.id = p.author_id
    JOIN profiles fb ON fb.id = pf.flagged_by
    LEFT JOIN profiles rb ON rb.id = pf.resolved_by
    WHERE (p_status = 'all' OR pf.status = p_status)
    ORDER BY pf.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get flagged comments for admin
CREATE OR REPLACE FUNCTION admin_get_flagged_comments(
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
      'id', cf.id,
      'comment_id', cf.comment_id,
      'flag_type', cf.flag_type,
      'reason', cf.reason,
      'status', cf.status,
      'created_at', cf.created_at,
      'flagged_by', jsonb_build_object('id', fb.id, 'full_name', fb.full_name),
      'comment', jsonb_build_object(
        'id', c.id,
        'body', c.body,
        'post_id', c.post_id,
        'author', jsonb_build_object('id', ca.id, 'full_name', ca.full_name)
      ),
      'post', jsonb_build_object(
        'id', p.id,
        'title', p.title
      ),
      'resolved_by', CASE WHEN cf.resolved_by IS NOT NULL THEN
        jsonb_build_object('id', rb.id, 'full_name', rb.full_name)
      ELSE NULL END,
      'resolved_at', cf.resolved_at,
      'resolution_notes', cf.resolution_notes
    ) as flag
    FROM comment_flags cf
    JOIN community_comments c ON c.id = cf.comment_id
    JOIN community_posts p ON p.id = c.post_id
    JOIN profiles ca ON ca.id = c.author_id
    JOIN profiles fb ON fb.id = cf.flagged_by
    LEFT JOIN profiles rb ON rb.id = cf.resolved_by
    WHERE (p_status = 'all' OR cf.status = p_status)
    ORDER BY cf.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin hide post
CREATE OR REPLACE FUNCTION admin_hide_post(
  p_post_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Check post exists
  IF NOT EXISTS (SELECT 1 FROM community_posts WHERE id = p_post_id) THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Hide the post
  UPDATE community_posts
  SET hidden_at = NOW(), hidden_by = auth.uid(), hide_reason = p_reason
  WHERE id = p_post_id;

  -- Log admin action
  PERFORM log_admin_action('post_hide', 'post', p_post_id, p_reason);

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin unhide post
CREATE OR REPLACE FUNCTION admin_unhide_post(
  p_post_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Unhide the post
  UPDATE community_posts
  SET hidden_at = NULL, hidden_by = NULL, hide_reason = NULL
  WHERE id = p_post_id;

  -- Log admin action
  PERFORM log_admin_action('post_unhide', 'post', p_post_id, p_reason);

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin delete post (hard delete)
CREATE OR REPLACE FUNCTION admin_delete_post(
  p_post_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_author_id UUID;
  v_title TEXT;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get post info for logging
  SELECT author_id, title INTO v_author_id, v_title FROM community_posts WHERE id = p_post_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Post not found';
  END IF;

  -- Log admin action before delete
  PERFORM log_admin_action('post_delete', 'post', p_post_id, p_reason,
    jsonb_build_object('author_id', v_author_id, 'title', v_title));

  -- Delete the post (cascades to comments, votes, flags)
  DELETE FROM community_posts WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'post_id', p_post_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin hide comment
CREATE OR REPLACE FUNCTION admin_hide_comment(
  p_comment_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Hide the comment
  UPDATE community_comments
  SET hidden_at = NOW(), hidden_by = auth.uid(), hide_reason = p_reason
  WHERE id = p_comment_id;

  -- Log admin action
  PERFORM log_admin_action('comment_hide', 'comment', p_comment_id, p_reason);

  RETURN jsonb_build_object('success', true, 'comment_id', p_comment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin delete comment (hard delete)
CREATE OR REPLACE FUNCTION admin_delete_comment(
  p_comment_id UUID,
  p_reason TEXT
) RETURNS JSONB AS $$
DECLARE
  v_author_id UUID;
  v_post_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get comment info
  SELECT author_id, post_id INTO v_author_id, v_post_id FROM community_comments WHERE id = p_comment_id;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Comment not found';
  END IF;

  -- Log admin action before delete
  PERFORM log_admin_action('comment_delete', 'comment', p_comment_id, p_reason,
    jsonb_build_object('author_id', v_author_id, 'post_id', v_post_id));

  -- Delete the comment
  DELETE FROM community_comments WHERE id = p_comment_id;

  RETURN jsonb_build_object('success', true, 'comment_id', p_comment_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin pin/unpin post
CREATE OR REPLACE FUNCTION admin_toggle_post_pin(
  p_post_id UUID,
  p_pinned BOOLEAN
) RETURNS JSONB AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE community_posts SET is_pinned = p_pinned WHERE id = p_post_id;

  -- Log admin action
  PERFORM log_admin_action(
    CASE WHEN p_pinned THEN 'post_pin' ELSE 'post_unpin' END,
    'post', p_post_id,
    CASE WHEN p_pinned THEN 'Post pinned' ELSE 'Post unpinned' END
  );

  RETURN jsonb_build_object('success', true, 'is_pinned', p_pinned);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin lock/unlock post
CREATE OR REPLACE FUNCTION admin_toggle_post_lock(
  p_post_id UUID,
  p_locked BOOLEAN
) RETURNS JSONB AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE community_posts SET is_locked = p_locked WHERE id = p_post_id;

  -- Log admin action
  PERFORM log_admin_action(
    CASE WHEN p_locked THEN 'post_lock' ELSE 'post_unlock' END,
    'post', p_post_id,
    CASE WHEN p_locked THEN 'Post locked' ELSE 'Post unlocked' END
  );

  RETURN jsonb_build_object('success', true, 'is_locked', p_locked);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin resolve post flag
CREATE OR REPLACE FUNCTION admin_resolve_post_flag(
  p_flag_id UUID,
  p_status TEXT,
  p_resolution_notes TEXT
) RETURNS JSONB AS $$
DECLARE
  v_post_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get post ID
  SELECT post_id INTO v_post_id FROM post_flags WHERE id = p_flag_id;

  IF v_post_id IS NULL THEN
    RAISE EXCEPTION 'Flag not found';
  END IF;

  -- Update flag
  UPDATE post_flags
  SET status = p_status, resolved_by = auth.uid(), resolved_at = NOW(), resolution_notes = p_resolution_notes
  WHERE id = p_flag_id;

  -- Log admin action
  PERFORM log_admin_action('post_flag_resolve', 'post_flag', p_flag_id, p_resolution_notes,
    jsonb_build_object('new_status', p_status, 'post_id', v_post_id));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin resolve comment flag
CREATE OR REPLACE FUNCTION admin_resolve_comment_flag(
  p_flag_id UUID,
  p_status TEXT,
  p_resolution_notes TEXT
) RETURNS JSONB AS $$
DECLARE
  v_comment_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Get comment ID
  SELECT comment_id INTO v_comment_id FROM comment_flags WHERE id = p_flag_id;

  IF v_comment_id IS NULL THEN
    RAISE EXCEPTION 'Flag not found';
  END IF;

  -- Update flag
  UPDATE comment_flags
  SET status = p_status, resolved_by = auth.uid(), resolved_at = NOW(), resolution_notes = p_resolution_notes
  WHERE id = p_flag_id;

  -- Log admin action
  PERFORM log_admin_action('comment_flag_resolve', 'comment_flag', p_flag_id, p_resolution_notes,
    jsonb_build_object('new_status', p_status, 'comment_id', v_comment_id));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin issue content warning
CREATE OR REPLACE FUNCTION admin_issue_warning(
  p_user_id UUID,
  p_warning_type TEXT,
  p_reason TEXT,
  p_related_post_id UUID DEFAULT NULL,
  p_related_comment_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_warning_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Create warning
  INSERT INTO content_warnings (user_id, issued_by, warning_type, reason, related_post_id, related_comment_id)
  VALUES (p_user_id, auth.uid(), p_warning_type, p_reason, p_related_post_id, p_related_comment_id)
  RETURNING id INTO v_warning_id;

  -- Create notification for user
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_user_id,
    'warning',
    'Content Warning Issued',
    p_reason,
    jsonb_build_object('warning_id', v_warning_id, 'warning_type', p_warning_type)
  );

  -- Log admin action
  PERFORM log_admin_action('warning_issue', 'content_warning', v_warning_id, p_reason,
    jsonb_build_object('user_id', p_user_id, 'warning_type', p_warning_type));

  RETURN jsonb_build_object('success', true, 'warning_id', v_warning_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user warnings for admin
CREATE OR REPLACE FUNCTION admin_get_user_warnings(p_user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_agg(warning ORDER BY warning->>'created_at' DESC) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', w.id,
      'user', jsonb_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'avatar_url', u.avatar_url),
      'warning_type', w.warning_type,
      'reason', w.reason,
      'related_post_id', w.related_post_id,
      'related_comment_id', w.related_comment_id,
      'issued_by', jsonb_build_object('id', ib.id, 'full_name', ib.full_name),
      'acknowledged_at', w.acknowledged_at,
      'created_at', w.created_at
    ) as warning
    FROM content_warnings w
    JOIN profiles u ON u.id = w.user_id
    JOIN profiles ib ON ib.id = w.issued_by
    WHERE (p_user_id IS NULL OR w.user_id = p_user_id)
    ORDER BY w.created_at DESC
    LIMIT 100
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all content warnings for admin
CREATE OR REPLACE FUNCTION admin_get_all_warnings(
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

  SELECT jsonb_agg(warning ORDER BY warning->>'created_at' DESC) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', w.id,
      'user', jsonb_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'avatar_url', u.avatar_url),
      'warning_type', w.warning_type,
      'reason', w.reason,
      'related_post_id', w.related_post_id,
      'related_comment_id', w.related_comment_id,
      'issued_by', jsonb_build_object('id', ib.id, 'full_name', ib.full_name),
      'acknowledged_at', w.acknowledged_at,
      'created_at', w.created_at
    ) as warning
    FROM content_warnings w
    JOIN profiles u ON u.id = w.user_id
    JOIN profiles ib ON ib.id = w.issued_by
    ORDER BY w.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get banned words
CREATE OR REPLACE FUNCTION admin_get_banned_words()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'id', bw.id,
    'word', bw.word,
    'severity', bw.severity,
    'is_active', bw.is_active,
    'added_by', jsonb_build_object('id', p.id, 'full_name', p.full_name),
    'created_at', bw.created_at
  ) ORDER BY bw.word) INTO v_result
  FROM banned_words bw
  JOIN profiles p ON p.id = bw.added_by;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add banned word
CREATE OR REPLACE FUNCTION admin_add_banned_word(
  p_word TEXT,
  p_severity TEXT DEFAULT 'flag'
) RETURNS JSONB AS $$
DECLARE
  v_word_id UUID;
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  INSERT INTO banned_words (word, severity, added_by)
  VALUES (LOWER(TRIM(p_word)), p_severity, auth.uid())
  ON CONFLICT (word) DO UPDATE SET severity = p_severity, is_active = true
  RETURNING id INTO v_word_id;

  RETURN jsonb_build_object('success', true, 'word_id', v_word_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove banned word
CREATE OR REPLACE FUNCTION admin_remove_banned_word(p_word_id UUID)
RETURNS JSONB AS $$
BEGIN
  -- Check admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  UPDATE banned_words SET is_active = false WHERE id = p_word_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
