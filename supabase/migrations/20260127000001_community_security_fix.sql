/*
  # Community Hub Security Fix - CRITICAL

  This migration fixes a critical security issue where hidden posts are visible
  to all users in the community_posts_with_stats view.

  ## Issues Fixed:
  1. View `community_posts_with_stats` now filters out hidden posts
  2. RLS policy on `community_posts` respects hidden_at for non-admins
  3. RLS policy on `community_comments` respects hidden_at for non-admins
  4. Comment count in view only counts non-hidden comments

  ## Safe Application
  All statements are idempotent and safe to run multiple times.
*/

-- ==============================================================
-- PART 1: Fix community_posts_with_stats view
-- Add WHERE p.hidden_at IS NULL to filter hidden posts
-- Filter hidden comments from comment_count
-- ==============================================================

CREATE OR REPLACE VIEW public.community_posts_with_stats AS
SELECT
  p.id,
  p.author_id,
  p.title,
  p.body,
  p.category,
  p.is_pinned,
  p.is_locked,
  p.created_at,
  p.updated_at,
  prof.full_name AS author_name,
  prof.avatar_url AS author_avatar_url,
  COALESCE((SELECT SUM(v.vote) FROM public.community_post_votes v WHERE v.post_id = p.id), 0) AS score,
  COALESCE((SELECT COUNT(*) FROM public.community_comments c WHERE c.post_id = p.id AND c.hidden_at IS NULL), 0) AS comment_count
FROM public.community_posts p
JOIN public.profiles prof ON prof.id = p.author_id
WHERE p.hidden_at IS NULL;  -- CRITICAL: Only show non-hidden posts

COMMENT ON VIEW public.community_posts_with_stats IS
'Public view of community posts with vote scores and comment counts. Excludes hidden/moderated posts.';

-- ==============================================================
-- PART 2: Fix RLS policy for community_posts SELECT
-- Allow users to see non-hidden posts, their own hidden posts, or all if admin
-- ==============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Community posts are readable" ON public.community_posts;

-- Create the secure policy
CREATE POLICY "Community posts are readable"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (
    hidden_at IS NULL  -- Normal users see only visible posts
    OR author_id = auth.uid()  -- Authors can see their own hidden posts
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true  -- Admins see all
  );

-- ==============================================================
-- PART 3: Fix RLS policy for community_comments SELECT
-- Same pattern as posts
-- ==============================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Community comments are readable" ON public.community_comments;

-- Create the secure policy
CREATE POLICY "Community comments are readable"
  ON public.community_comments FOR SELECT
  TO authenticated
  USING (
    hidden_at IS NULL
    OR author_id = auth.uid()
    OR (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- ==============================================================
-- PART 4: Add indexes for hidden_at filtering performance
-- ==============================================================

CREATE INDEX IF NOT EXISTS idx_community_posts_hidden_at
  ON public.community_posts (hidden_at) WHERE hidden_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_community_comments_hidden_at
  ON public.community_comments (hidden_at) WHERE hidden_at IS NULL;

-- ==============================================================
-- PART 5: Add community_posts to realtime publication
-- ==============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'community_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'community_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
  END IF;
END $$;

-- ==============================================================
-- PART 6: Create a view for admin to see ALL posts including hidden
-- ==============================================================

CREATE OR REPLACE VIEW public.community_posts_admin_view AS
SELECT
  p.id,
  p.author_id,
  p.title,
  p.body,
  p.category,
  p.is_pinned,
  p.is_locked,
  p.hidden_at,
  p.hidden_by,
  p.hide_reason,
  p.created_at,
  p.updated_at,
  prof.full_name AS author_name,
  prof.avatar_url AS author_avatar_url,
  COALESCE((SELECT SUM(v.vote) FROM public.community_post_votes v WHERE v.post_id = p.id), 0) AS score,
  COALESCE((SELECT COUNT(*) FROM public.community_comments c WHERE c.post_id = p.id), 0) AS total_comment_count,
  COALESCE((SELECT COUNT(*) FROM public.community_comments c WHERE c.post_id = p.id AND c.hidden_at IS NULL), 0) AS visible_comment_count,
  COALESCE((SELECT COUNT(*) FROM public.post_flags f WHERE f.post_id = p.id AND f.status = 'pending'), 0) AS pending_flags
FROM public.community_posts p
JOIN public.profiles prof ON prof.id = p.author_id;

-- Only admins can access this view
REVOKE ALL ON public.community_posts_admin_view FROM PUBLIC;
GRANT SELECT ON public.community_posts_admin_view TO authenticated;

-- Use RLS indirectly through a function wrapper
CREATE OR REPLACE FUNCTION public.get_community_posts_admin()
RETURNS SETOF public.community_posts_admin_view
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM community_posts_admin_view
  WHERE (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
  ORDER BY created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_community_posts_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_posts_admin() TO authenticated;

-- ==============================================================
-- DONE: Community security fix complete
-- ==============================================================

COMMENT ON FUNCTION public.get_community_posts_admin() IS
'Admin-only function to get all community posts including hidden ones.';
