/*
  # Fix Friend Accept & Group Invite - Remove Notification Inserts
  
  The accept_friend_request and invite_to_group functions were failing because 
  inserting into the notifications table triggers a database webhook that is 
  misconfigured with "Unexpected operation type: notification_created".
  
  This fix removes the notification INSERT from these functions.
  Notifications should be handled client-side instead.
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

-- Recreate invite_to_group without notification insert
CREATE OR REPLACE FUNCTION invite_to_group(p_group_id uuid, p_invitee_id uuid, p_message text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_invite_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has permission to invite
  SELECT role INTO v_user_role
  FROM social_group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF v_user_role NOT IN ('OWNER', 'ADMIN', 'MODERATOR') THEN
    RAISE EXCEPTION 'Only admins and moderators can invite users';
  END IF;

  -- Check if invitee is already a member
  IF EXISTS (SELECT 1 FROM social_group_members WHERE group_id = p_group_id AND user_id = p_invitee_id) THEN
    RAISE EXCEPTION 'User is already a member of this group';
  END IF;

  -- Create or update invite
  INSERT INTO social_group_invites (group_id, inviter_id, invitee_id, message, status)
  VALUES (p_group_id, v_user_id, p_invitee_id, p_message, 'PENDING')
  ON CONFLICT (group_id, invitee_id)
  DO UPDATE SET inviter_id = v_user_id, message = p_message, status = 'PENDING', created_at = now(), responded_at = NULL
  RETURNING id INTO v_invite_id;

  -- NOTE: Notification creation removed due to database webhook conflict

  RETURN v_invite_id;
END;
$$;

-- Ensure grants are correct
REVOKE ALL ON FUNCTION accept_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_friend_request(uuid) TO authenticated;

REVOKE ALL ON FUNCTION decline_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_friend_request(uuid) TO authenticated;

REVOKE ALL ON FUNCTION invite_to_group(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION invite_to_group(uuid, uuid, text) TO authenticated;
