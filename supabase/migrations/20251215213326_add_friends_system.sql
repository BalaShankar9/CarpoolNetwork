/*
  # Friends System

  1. New Tables
    - `friend_requests` - Pending/accepted/declined friend requests
    - `friendships` - Established friendships (stored as ordered pairs)
    - `blocks` - User blocking system

  2. Security
    - Users can view friend requests they sent or received
    - Only receiver can accept/decline requests
    - Only sender can cancel pending requests
    - Users can view their own friendships
    - Users can view only their own blocks

  3. Constraints
    - Unique constraints to prevent duplicate requests
    - Ordered pair storage for friendships (user_a < user_b)
    - Friend requests and blocks prevent certain interactions
*/

-- Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_user_id, to_user_id),
  CHECK (from_user_id != to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_from_user_id ON friend_requests(from_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_to_user_id ON friend_requests(to_user_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_a, user_b),
  CHECK (user_a < user_b)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

-- Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_requests

-- Users can view requests they sent or received
CREATE POLICY "Users can view own friend requests"
  ON friend_requests FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON friend_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    from_user_id = auth.uid() AND
    -- Prevent sending to blocked users or users who blocked you
    NOT EXISTS (
      SELECT 1 FROM blocks
      WHERE (blocker_id = auth.uid() AND blocked_id = to_user_id)
         OR (blocker_id = to_user_id AND blocked_id = auth.uid())
    )
  );

-- Sender can cancel their pending request
CREATE POLICY "Sender can cancel pending request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (from_user_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (from_user_id = auth.uid() AND status = 'CANCELLED');

-- Receiver can accept/decline request
CREATE POLICY "Receiver can accept or decline request"
  ON friend_requests FOR UPDATE
  TO authenticated
  USING (to_user_id = auth.uid() AND status = 'PENDING')
  WITH CHECK (to_user_id = auth.uid() AND status IN ('ACCEPTED', 'DECLINED'));

-- RLS Policies for friendships

-- Users can view their own friendships
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- Friendships are created via RPC function (after accepting request)
CREATE POLICY "Friendships created via function"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- Users can delete (unfriend)
CREATE POLICY "Users can unfriend"
  ON friendships FOR DELETE
  TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid());

-- RLS Policies for blocks

-- Users can view only their own blocks
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

-- Users can block others
CREATE POLICY "Users can block others"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can unblock
CREATE POLICY "Users can unblock"
  ON blocks FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- Add updated_at trigger for friend_requests
DROP TRIGGER IF EXISTS update_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER update_friend_requests_updated_at
  BEFORE UPDATE ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to send friend request
CREATE OR REPLACE FUNCTION send_friend_request(p_to_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_user_id uuid;
  v_request_id uuid;
BEGIN
  v_from_user_id := auth.uid();
  
  IF v_from_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_from_user_id = p_to_user_id THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;

  -- Check if blocked
  IF EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = v_from_user_id AND blocked_id = p_to_user_id)
       OR (blocker_id = p_to_user_id AND blocked_id = v_from_user_id)
  ) THEN
    RAISE EXCEPTION 'Cannot send friend request due to block';
  END IF;

  -- Check if already friends
  IF EXISTS (
    SELECT 1 FROM friendships
    WHERE (user_a = LEAST(v_from_user_id, p_to_user_id) AND user_b = GREATEST(v_from_user_id, p_to_user_id))
  ) THEN
    RAISE EXCEPTION 'Already friends';
  END IF;

  -- Insert or update request
  INSERT INTO friend_requests (from_user_id, to_user_id, status)
  VALUES (v_from_user_id, p_to_user_id, 'PENDING')
  ON CONFLICT (from_user_id, to_user_id)
  DO UPDATE SET status = 'PENDING', updated_at = now()
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Function to accept friend request
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
BEGIN
  -- Get request details
  SELECT from_user_id, to_user_id
  INTO v_from_user_id, v_to_user_id
  FROM friend_requests
  WHERE id = p_request_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Verify caller is the receiver
  IF v_to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the receiver can accept this request';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'ACCEPTED', updated_at = now()
  WHERE id = p_request_id;

  -- Create friendship (ordered pair)
  INSERT INTO friendships (user_a, user_b)
  VALUES (LEAST(v_from_user_id, v_to_user_id), GREATEST(v_from_user_id, v_to_user_id))
  ON CONFLICT (user_a, user_b) DO NOTHING
  RETURNING id INTO v_friendship_id;

  -- Create notification for sender
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_from_user_id,
    'system',
    'Friend Request Accepted',
    'Your friend request was accepted!',
    jsonb_build_object('request_id', p_request_id, 'friend_id', v_to_user_id)
  );

  RETURN v_friendship_id;
END;
$$;

-- Function to decline friend request
CREATE OR REPLACE FUNCTION decline_friend_request(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to_user_id uuid;
BEGIN
  -- Get request details
  SELECT to_user_id
  INTO v_to_user_id
  FROM friend_requests
  WHERE id = p_request_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Verify caller is the receiver
  IF v_to_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the receiver can decline this request';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'DECLINED', updated_at = now()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(p_user_id_1 uuid, p_user_id_2 uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships
    WHERE user_a = LEAST(p_user_id_1, p_user_id_2)
      AND user_b = GREATEST(p_user_id_1, p_user_id_2)
  );
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION send_friend_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_friend_request TO authenticated;

REVOKE ALL ON FUNCTION accept_friend_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_friend_request TO authenticated;

REVOKE ALL ON FUNCTION decline_friend_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_friend_request TO authenticated;

REVOKE ALL ON FUNCTION are_friends FROM PUBLIC;
GRANT EXECUTE ON FUNCTION are_friends TO authenticated;
