/*
  # Fix Friend System Functions
  
  This migration ensures the friend system functions work correctly by:
  1. Recreating the functions with proper error handling
  2. Ensuring RLS policies are correct
  3. Adding proper grants
*/

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS accept_friend_request(uuid);
DROP FUNCTION IF EXISTS decline_friend_request(uuid);
DROP FUNCTION IF EXISTS send_friend_request(uuid);

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
  v_current_user uuid;
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
  v_current_user uuid;
BEGIN
  -- Get current user ID
  v_current_user := auth.uid();
  
  IF v_current_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get request details
  SELECT to_user_id
  INTO v_to_user_id
  FROM friend_requests
  WHERE id = p_request_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;

  -- Verify caller is the receiver
  IF v_to_user_id != v_current_user THEN
    RAISE EXCEPTION 'Only the receiver can decline this request';
  END IF;

  -- Update request status
  UPDATE friend_requests
  SET status = 'DECLINED', updated_at = now()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

-- Ensure RLS is enabled
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Drop and recreate friendships INSERT policy to ensure it's correct
DROP POLICY IF EXISTS "Friendships created via function" ON friendships;
CREATE POLICY "Friendships created via function"
  ON friendships FOR INSERT
  TO authenticated
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());

-- Grant execute permissions
REVOKE ALL ON FUNCTION send_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION send_friend_request(uuid) TO authenticated;

REVOKE ALL ON FUNCTION accept_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_friend_request(uuid) TO authenticated;

REVOKE ALL ON FUNCTION decline_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_friend_request(uuid) TO authenticated;
