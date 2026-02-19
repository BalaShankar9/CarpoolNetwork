/*
  # Friends System Upgrade

  This migration enhances the friends system with:
  1. Auto-create FRIENDS_DM conversation when friend request is accepted
  2. Add realtime publication for social tables
  3. Add/recreate performance indexes
  4. Add helper function to get or create DM conversation

  ## Safe Application
  All statements are idempotent and safe to run multiple times.
*/

-- ==============================================================
-- PART 1: Enhanced accept_friend_request with DM creation
-- ==============================================================

CREATE OR REPLACE FUNCTION accept_friend_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_user_id uuid;
  v_to_user_id uuid;
  v_friendship_id uuid;
  v_current_user uuid;
  v_conversation_id uuid;
BEGIN
  -- Get current user ID
  v_current_user := auth.uid();

  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get request details
  SELECT from_user_id, to_user_id
  INTO v_from_user_id, v_to_user_id
  FROM friend_requests
  WHERE id = p_request_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Verify caller is the receiver
  IF v_to_user_id != v_current_user THEN
    RAISE EXCEPTION 'Only the receiver can accept this request';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = p_request_id;

  -- Create friendship (ordered pair) - bypass RLS for this operation
  INSERT INTO friendships (user_a, user_b)
  VALUES (LEAST(v_from_user_id, v_to_user_id), GREATEST(v_from_user_id, v_to_user_id))
  ON CONFLICT (user_a, user_b) DO NOTHING
  RETURNING id INTO v_friendship_id;

  -- Auto-create FRIENDS_DM conversation for the new friends
  -- Check if a DM conversation already exists between these users
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'FRIENDS_DM'
    AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = v_from_user_id)
    AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = v_to_user_id)
  LIMIT 1;

  -- If no DM exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type)
    VALUES ('FRIENDS_DM')
    RETURNING id INTO v_conversation_id;

    -- Add both users as members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, v_from_user_id, 'FRIEND'),
      (v_conversation_id, v_to_user_id, 'FRIEND')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN v_friendship_id;
END;
$$;

COMMENT ON FUNCTION accept_friend_request(uuid) IS
'Accepts a friend request, creates friendship, and auto-creates a FRIENDS_DM conversation.';

-- ==============================================================
-- PART 2: Helper function to get or create DM conversation
-- ==============================================================

CREATE OR REPLACE FUNCTION get_or_create_dm(p_friend_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_conversation_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_user_id = p_friend_id THEN
    RAISE EXCEPTION 'Cannot create DM with yourself';
  END IF;

  -- Verify they are actually friends
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_a = LEAST(v_user_id, p_friend_id) AND user_b = GREATEST(v_user_id, p_friend_id))
  ) THEN
    RAISE EXCEPTION 'You can only message friends';
  END IF;

  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = v_user_id AND blocked_id = p_friend_id)
       OR (blocker_id = p_friend_id AND blocked_id = v_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot message this user due to a block';
  END IF;

  -- Look for existing DM conversation
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  WHERE c.type = 'FRIENDS_DM'
    AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = v_user_id)
    AND EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = c.id AND cm.user_id = p_friend_id)
  LIMIT 1;

  -- If no DM exists, create one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (type)
    VALUES ('FRIENDS_DM')
    RETURNING id INTO v_conversation_id;

    -- Add both users as members
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES
      (v_conversation_id, v_user_id, 'FRIEND'),
      (v_conversation_id, p_friend_id, 'FRIEND');
  END IF;

  RETURN v_conversation_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_dm(uuid) IS
'Gets an existing DM conversation with a friend or creates one if none exists.';

REVOKE ALL ON FUNCTION get_or_create_dm(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_or_create_dm(uuid) TO authenticated;

-- ==============================================================
-- PART 3: Performance indexes for friends system
-- ==============================================================

-- Friend requests indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user_id
  ON friend_requests(from_user_id);

CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user_id
  ON friend_requests(to_user_id);

CREATE INDEX IF NOT EXISTS idx_friend_requests_status
  ON friend_requests(status) WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_friend_requests_combined
  ON friend_requests(to_user_id, status);

-- Friendships indexes
CREATE INDEX IF NOT EXISTS idx_friendships_user_a
  ON friendships(user_a);

CREATE INDEX IF NOT EXISTS idx_friendships_user_b
  ON friendships(user_b);

-- Blocks indexes
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id
  ON blocks(blocker_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id
  ON blocks(blocked_id);

CREATE INDEX IF NOT EXISTS idx_blocks_combined
  ON blocks(blocker_id, blocked_id);

-- Social group members indexes (ensure they exist)
CREATE INDEX IF NOT EXISTS idx_social_group_members_user_role
  ON social_group_members(user_id, role);

-- ==============================================================
-- PART 4: Add social tables to realtime publication
-- ==============================================================

DO $$
BEGIN
  -- Add friend_requests to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'friend_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;
  END IF;

  -- Add friendships to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'friendships'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
  END IF;

  -- Add social_group_invites to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'social_group_invites'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_group_invites;
  END IF;

  -- Add social_group_members to realtime
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'social_group_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.social_group_members;
  END IF;
END $$;

-- ==============================================================
-- PART 5: Function to unfriend a user
-- ==============================================================

CREATE OR REPLACE FUNCTION unfriend_user(p_friend_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_user_id = p_friend_id THEN
    RAISE EXCEPTION 'Invalid operation';
  END IF;

  -- Delete the friendship
  DELETE FROM friendships
  WHERE user_a = LEAST(v_user_id, p_friend_id)
    AND user_b = GREATEST(v_user_id, p_friend_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friendship not found';
  END IF;

  -- Also clean up any pending friend requests between them
  UPDATE friend_requests
  SET status = 'DECLINED', updated_at = now()
  WHERE ((from_user_id = v_user_id AND to_user_id = p_friend_id)
     OR (from_user_id = p_friend_id AND to_user_id = v_user_id))
    AND status = 'PENDING';

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION unfriend_user(uuid) IS
'Removes a friendship between the current user and the specified friend.';

REVOKE ALL ON FUNCTION unfriend_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unfriend_user(uuid) TO authenticated;

-- ==============================================================
-- PART 6: Function to get friends list with online status
-- ==============================================================

CREATE OR REPLACE FUNCTION get_friends_with_status()
RETURNS TABLE (
  friend_id uuid,
  full_name text,
  avatar_url text,
  is_online boolean,
  last_seen timestamptz,
  friendship_id uuid,
  friends_since timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN f.user_a = auth.uid() THEN f.user_b
      ELSE f.user_a
    END AS friend_id,
    p.full_name,
    p.avatar_url,
    COALESCE(p.is_online, false) AS is_online,
    p.last_seen,
    f.id AS friendship_id,
    f.created_at AS friends_since
  FROM friendships f
  JOIN profiles p ON p.id = CASE
    WHEN f.user_a = auth.uid() THEN f.user_b
    ELSE f.user_a
  END
  WHERE f.user_a = auth.uid() OR f.user_b = auth.uid()
  ORDER BY p.is_online DESC NULLS LAST, p.full_name ASC;
$$;

COMMENT ON FUNCTION get_friends_with_status() IS
'Returns the current user''s friends list with online status, sorted by online first.';

REVOKE ALL ON FUNCTION get_friends_with_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_friends_with_status() TO authenticated;

-- ==============================================================
-- PART 7: Function to get blocked users
-- ==============================================================

CREATE OR REPLACE FUNCTION get_blocked_users()
RETURNS TABLE (
  block_id uuid,
  blocked_id uuid,
  full_name text,
  avatar_url text,
  blocked_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    b.id AS block_id,
    b.blocked_id,
    p.full_name,
    p.avatar_url,
    b.created_at AS blocked_at
  FROM blocks b
  JOIN profiles p ON p.id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC;
$$;

COMMENT ON FUNCTION get_blocked_users() IS
'Returns the list of users blocked by the current user.';

REVOKE ALL ON FUNCTION get_blocked_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_blocked_users() TO authenticated;

-- ==============================================================
-- PART 8: Function to unblock a user
-- ==============================================================

CREATE OR REPLACE FUNCTION unblock_user(p_blocked_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM blocks
  WHERE blocker_id = v_user_id AND blocked_id = p_blocked_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Block not found';
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION unblock_user(uuid) IS
'Unblocks a previously blocked user.';

REVOKE ALL ON FUNCTION unblock_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION unblock_user(uuid) TO authenticated;

-- ==============================================================
-- DONE: Friends system upgrade complete
-- ==============================================================
