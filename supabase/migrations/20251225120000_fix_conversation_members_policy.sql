/*
  # Fix conversation_members RLS recursion

  1. Changes
    - Add security definer helper to check conversation membership without RLS recursion
    - Update conversation_members select policy to use helper

  2. Security
    - Helper runs with row_security disabled and is restricted to authenticated users
*/

CREATE OR REPLACE FUNCTION public.is_conversation_member(
  check_conversation_id uuid,
  check_user_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security TO off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM conversation_members
    WHERE conversation_id = check_conversation_id
      AND user_id = check_user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can view members of their conversations" ON conversation_members;
CREATE POLICY "Users can view members of their conversations"
  ON conversation_members FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_member(conversation_members.conversation_id, (select auth.uid()))
  );

