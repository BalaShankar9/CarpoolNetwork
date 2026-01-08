/*
  # Fix Friend Accept - Remove Notification Insert
  
  The accept_friend_request function was failing because inserting into
  the notifications table triggers a database webhook that is misconfigured.
  
  This fix removes the notification INSERT from the function.
  Notifications will be handled client-side instead.
*/

-- Recreate accept_friend_request without notification insert
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

  -- NOTE: Notification creation removed due to database webhook conflict
  -- Notifications should be handled client-side or via a separate mechanism

  RETURN v_friendship_id;
END;
$$;

-- Recreate decline_friend_request (just to keep it up to date)
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

-- Ensure grants are correct
REVOKE ALL ON FUNCTION accept_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_friend_request(uuid) TO authenticated;

REVOKE ALL ON FUNCTION decline_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_friend_request(uuid) TO authenticated;
