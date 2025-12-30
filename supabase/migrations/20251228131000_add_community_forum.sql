/*
  # Add community forum tables

  1. Tables
    - community_posts
    - community_comments
    - community_post_votes
  2. Views
    - community_posts_with_stats
  3. RLS
    - Authenticated read/write with owner controls
*/

-- Posts
CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) > 0),
  body text NOT NULL,
  category text,
  is_pinned boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Comments
CREATE TABLE IF NOT EXISTS public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Votes
CREATE TABLE IF NOT EXISTS public.community_post_votes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_community_posts_created_at ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON public.community_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_category ON public.community_posts(category);

CREATE INDEX IF NOT EXISTS idx_community_comments_post ON public.community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_community_comments_author ON public.community_comments(author_id);

CREATE INDEX IF NOT EXISTS idx_community_post_votes_post ON public.community_post_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_community_post_votes_user ON public.community_post_votes(user_id);

-- Updated at triggers
DROP TRIGGER IF EXISTS update_community_posts_updated_at ON public.community_posts;
CREATE TRIGGER update_community_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_comments_updated_at ON public.community_comments;
CREATE TRIGGER update_community_comments_updated_at
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_community_post_votes_updated_at ON public.community_post_votes;
CREATE TRIGGER update_community_post_votes_updated_at
  BEFORE UPDATE ON public.community_post_votes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_post_votes ENABLE ROW LEVEL SECURITY;

-- Posts policies
DROP POLICY IF EXISTS "Community posts are readable" ON public.community_posts;
CREATE POLICY "Community posts are readable"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create community posts" ON public.community_posts;
CREATE POLICY "Users can create community posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own community posts" ON public.community_posts;
CREATE POLICY "Users can update own community posts"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR (select is_admin()) = true);

DROP POLICY IF EXISTS "Users can delete own community posts" ON public.community_posts;
CREATE POLICY "Users can delete own community posts"
  ON public.community_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR (select is_admin()) = true);

-- Comments policies
DROP POLICY IF EXISTS "Community comments are readable" ON public.community_comments;
CREATE POLICY "Community comments are readable"
  ON public.community_comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create community comments" ON public.community_comments;
CREATE POLICY "Users can create community comments"
  ON public.community_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Users can update own community comments" ON public.community_comments;
CREATE POLICY "Users can update own community comments"
  ON public.community_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id OR (select is_admin()) = true);

DROP POLICY IF EXISTS "Users can delete own community comments" ON public.community_comments;
CREATE POLICY "Users can delete own community comments"
  ON public.community_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR (select is_admin()) = true);

-- Votes policies
DROP POLICY IF EXISTS "Community votes are readable" ON public.community_post_votes;
CREATE POLICY "Community votes are readable"
  ON public.community_post_votes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create community votes" ON public.community_post_votes;
CREATE POLICY "Users can create community votes"
  ON public.community_post_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own community votes" ON public.community_post_votes;
CREATE POLICY "Users can update own community votes"
  ON public.community_post_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own community votes" ON public.community_post_votes;
CREATE POLICY "Users can delete own community votes"
  ON public.community_post_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- View for posts with stats
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
  COALESCE((SELECT COUNT(*) FROM public.community_comments c WHERE c.post_id = p.id), 0) AS comment_count
FROM public.community_posts p
JOIN public.profiles prof ON prof.id = p.author_id;

GRANT SELECT ON public.community_posts_with_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_votes TO authenticated;
