/*
  # Social Groups System
  
  Add social groups functionality to CarpoolNetwork, allowing users to create and join
  interest-based or location-based groups within the carpool community.
  
  1. New Tables
    - `social_groups` - Social/interest groups
    - `social_group_members` - Group membership
    - `social_group_invites` - Invitations to join groups
    
  2. Extended Conversations
    - Add 'GROUP_CHAT' type to conversations for group messaging
    
  3. Security
    - Group owners/admins can manage membership
    - Members can post in groups and chat
    - Public groups are discoverable
*/

-- Add GROUP_CHAT to conversation types
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_type_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_type_check 
  CHECK (type IN ('RIDE_MATCH', 'TRIP_MATCH', 'FRIENDS_DM', 'GROUP_CHAT'));

-- Add group_id reference to conversations
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_id uuid;

-- Create social_groups table
CREATE TABLE IF NOT EXISTS social_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  cover_image_url text,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'PUBLIC' CHECK (visibility IN ('PUBLIC', 'PRIVATE', 'INVITE_ONLY')),
  category text NOT NULL DEFAULT 'General' CHECK (category IN (
    'General', 'Commuters', 'Students', 'Professionals', 'Families', 
    'Weekend Travelers', 'Long Distance', 'Events', 'Local Area', 'Eco-Friendly'
  )),
  location text,
  member_count integer DEFAULT 1,
  max_members integer DEFAULT 100,
  rules text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_social_groups_owner_id ON social_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_social_groups_visibility ON social_groups(visibility);
CREATE INDEX IF NOT EXISTS idx_social_groups_category ON social_groups(category);
CREATE INDEX IF NOT EXISTS idx_social_groups_location ON social_groups(location) WHERE location IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_social_groups_is_active ON social_groups(is_active) WHERE is_active = true;

-- Create social_group_members table
CREATE TABLE IF NOT EXISTS social_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER')),
  joined_at timestamptz DEFAULT now(),
  muted_until timestamptz,
  notification_preference text DEFAULT 'ALL' CHECK (notification_preference IN ('ALL', 'MENTIONS', 'NONE')),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_social_group_members_group_id ON social_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_user_id ON social_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_social_group_members_role ON social_group_members(role);

-- Create social_group_invites table
CREATE TABLE IF NOT EXISTS social_group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES social_groups(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invitee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  message text,
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(group_id, invitee_id)
);

CREATE INDEX IF NOT EXISTS idx_social_group_invites_group_id ON social_group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_social_group_invites_invitee_id ON social_group_invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_social_group_invites_status ON social_group_invites(status);

-- Add foreign key for group_id in conversations
ALTER TABLE conversations ADD CONSTRAINT fk_conversations_group_id 
  FOREIGN KEY (group_id) REFERENCES social_groups(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_conversations_group_id ON conversations(group_id) WHERE group_id IS NOT NULL;

-- Enable RLS
ALTER TABLE social_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_group_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_groups

-- Anyone can view public groups
CREATE POLICY "Anyone can view public groups"
  ON social_groups FOR SELECT
  TO authenticated
  USING (visibility = 'PUBLIC' OR owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM social_group_members WHERE group_id = id AND user_id = auth.uid()));

-- Users can create groups
CREATE POLICY "Users can create groups"
  ON social_groups FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- Owners can update their groups
CREATE POLICY "Owners can update groups"
  ON social_groups FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM social_group_members WHERE group_id = id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN')));

-- Owners can delete their groups
CREATE POLICY "Owners can delete groups"
  ON social_groups FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- RLS Policies for social_group_members

-- Members can view group membership
CREATE POLICY "Members can view group membership"
  ON social_group_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM social_groups WHERE id = group_id AND (visibility = 'PUBLIC' OR owner_id = auth.uid()))
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM social_group_members sgm WHERE sgm.group_id = social_group_members.group_id AND sgm.user_id = auth.uid())
  );

-- Users can join public groups
CREATE POLICY "Users can join public groups"
  ON social_group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM social_groups WHERE id = group_id AND visibility = 'PUBLIC')
      OR EXISTS (SELECT 1 FROM social_group_invites WHERE group_id = social_group_members.group_id AND invitee_id = auth.uid() AND status = 'ACCEPTED')
      OR EXISTS (SELECT 1 FROM social_groups WHERE id = group_id AND owner_id = auth.uid())
    )
  );

-- Members can leave groups
CREATE POLICY "Members can leave groups"
  ON social_group_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM social_group_members admin WHERE admin.group_id = social_group_members.group_id AND admin.user_id = auth.uid() AND admin.role IN ('OWNER', 'ADMIN')));

-- Admins can update member roles
CREATE POLICY "Admins can update member roles"
  ON social_group_members FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM social_group_members admin WHERE admin.group_id = social_group_members.group_id AND admin.user_id = auth.uid() AND admin.role IN ('OWNER', 'ADMIN'))
  );

-- RLS Policies for social_group_invites

-- Users can view their invites
CREATE POLICY "Users can view their invites"
  ON social_group_invites FOR SELECT
  TO authenticated
  USING (inviter_id = auth.uid() OR invitee_id = auth.uid());

-- Admins/owners can send invites
CREATE POLICY "Admins can send invites"
  ON social_group_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_id = auth.uid() AND
    EXISTS (SELECT 1 FROM social_group_members WHERE group_id = social_group_invites.group_id AND user_id = auth.uid() AND role IN ('OWNER', 'ADMIN', 'MODERATOR'))
  );

-- Invitees can update (accept/decline) their invites
CREATE POLICY "Invitees can respond to invites"
  ON social_group_invites FOR UPDATE
  TO authenticated
  USING (invitee_id = auth.uid() OR inviter_id = auth.uid());

-- Function to create a social group
CREATE OR REPLACE FUNCTION create_social_group(
  p_name text,
  p_description text DEFAULT NULL,
  p_visibility text DEFAULT 'PUBLIC',
  p_category text DEFAULT 'General',
  p_location text DEFAULT NULL,
  p_rules text DEFAULT NULL,
  p_max_members integer DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_group_id uuid;
  v_conversation_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Create the group
  INSERT INTO social_groups (name, description, owner_id, visibility, category, location, rules, max_members)
  VALUES (p_name, p_description, v_user_id, p_visibility, p_category, p_location, p_rules, p_max_members)
  RETURNING id INTO v_group_id;

  -- Add creator as owner
  INSERT INTO social_group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'OWNER');

  -- Create group conversation
  INSERT INTO conversations (type, group_id)
  VALUES ('GROUP_CHAT', v_group_id)
  RETURNING id INTO v_conversation_id;

  -- Add owner to conversation
  INSERT INTO conversation_members (conversation_id, user_id, role)
  VALUES (v_conversation_id, v_user_id, 'FRIEND');

  RETURN v_group_id;
END;
$$;

-- Function to join a social group
CREATE OR REPLACE FUNCTION join_social_group(p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_group_visibility text;
  v_member_count integer;
  v_max_members integer;
  v_conversation_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if group exists and get details
  SELECT visibility, member_count, max_members
  INTO v_group_visibility, v_member_count, v_max_members
  FROM social_groups
  WHERE id = p_group_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found or inactive';
  END IF;

  IF v_member_count >= v_max_members THEN
    RAISE EXCEPTION 'Group is full';
  END IF;

  IF v_group_visibility != 'PUBLIC' THEN
    -- Check for accepted invite
    IF NOT EXISTS (
      SELECT 1 FROM social_group_invites 
      WHERE group_id = p_group_id AND invitee_id = v_user_id AND status = 'ACCEPTED'
    ) THEN
      RAISE EXCEPTION 'This group requires an invitation to join';
    END IF;
  END IF;

  -- Check if already a member
  IF EXISTS (SELECT 1 FROM social_group_members WHERE group_id = p_group_id AND user_id = v_user_id) THEN
    RAISE EXCEPTION 'Already a member of this group';
  END IF;

  -- Add to group
  INSERT INTO social_group_members (group_id, user_id, role)
  VALUES (p_group_id, v_user_id, 'MEMBER');

  -- Update member count
  UPDATE social_groups SET member_count = member_count + 1, updated_at = now()
  WHERE id = p_group_id;

  -- Add to group conversation
  SELECT id INTO v_conversation_id FROM conversations WHERE group_id = p_group_id AND type = 'GROUP_CHAT' LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN
    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_conversation_id, v_user_id, 'FRIEND')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to leave a social group
CREATE OR REPLACE FUNCTION leave_social_group(p_group_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_conversation_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get user role
  SELECT role INTO v_user_role
  FROM social_group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a member of this group';
  END IF;

  IF v_user_role = 'OWNER' THEN
    RAISE EXCEPTION 'Group owner cannot leave. Transfer ownership or delete the group instead.';
  END IF;

  -- Remove from group
  DELETE FROM social_group_members WHERE group_id = p_group_id AND user_id = v_user_id;

  -- Update member count
  UPDATE social_groups SET member_count = member_count - 1, updated_at = now()
  WHERE id = p_group_id;

  -- Remove from group conversation
  SELECT id INTO v_conversation_id FROM conversations WHERE group_id = p_group_id AND type = 'GROUP_CHAT' LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN
    DELETE FROM conversation_members WHERE conversation_id = v_conversation_id AND user_id = v_user_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- Function to invite user to group
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

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    p_invitee_id,
    'group-invite',
    'Group Invitation',
    'You have been invited to join a group',
    jsonb_build_object('group_id', p_group_id, 'invite_id', v_invite_id, 'inviter_id', v_user_id)
  );

  RETURN v_invite_id;
END;
$$;

-- Function to respond to group invite
CREATE OR REPLACE FUNCTION respond_to_group_invite(p_invite_id uuid, p_accept boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_group_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get invite details
  SELECT group_id INTO v_group_id
  FROM social_group_invites
  WHERE id = p_invite_id AND invitee_id = v_user_id AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found or already responded';
  END IF;

  -- Update invite status
  UPDATE social_group_invites
  SET status = CASE WHEN p_accept THEN 'ACCEPTED' ELSE 'DECLINED' END,
      responded_at = now()
  WHERE id = p_invite_id;

  -- If accepted, join the group
  IF p_accept THEN
    PERFORM join_social_group(v_group_id);
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION create_social_group FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_social_group TO authenticated;

REVOKE ALL ON FUNCTION join_social_group FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_social_group TO authenticated;

REVOKE ALL ON FUNCTION leave_social_group FROM PUBLIC;
GRANT EXECUTE ON FUNCTION leave_social_group TO authenticated;

REVOKE ALL ON FUNCTION invite_to_group FROM PUBLIC;
GRANT EXECUTE ON FUNCTION invite_to_group TO authenticated;

REVOKE ALL ON FUNCTION respond_to_group_invite FROM PUBLIC;
GRANT EXECUTE ON FUNCTION respond_to_group_invite TO authenticated;
