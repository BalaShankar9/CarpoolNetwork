/*
  Add social tables to the supabase_realtime publication so widget
  realtime subscriptions (postgres_changes) receive events.

  Tables added:
  - community_posts        (CommunityWidget, ActivityFeedWidget)
  - community_post_votes   (CommunityWidget)
  - user_challenges        (ActivityFeedWidget)
  - social_group_members   (ActivityFeedWidget)
  - social_group_invites   (SocialContext)
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_posts;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'community_post_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE community_post_votes;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_challenges'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_challenges;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'social_group_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_group_members;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'social_group_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE social_group_invites;
  END IF;
END $$;
