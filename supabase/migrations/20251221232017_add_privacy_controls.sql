/*
  # Add Privacy Control Fields to User Preferences

  1. Privacy Fields
    - `phone_visible` (boolean) - Whether phone number is visible to others
    - `email_visible` (boolean) - Whether email is visible on profile
    - `profile_searchable` (boolean) - Whether profile appears in search
    - `allow_messages_from` (text) - Who can send messages (anyone, verified, connections)

  2. Security
    - These fields control user privacy preferences
    - All fields have sensible defaults
    - RLS policies already exist for user_preferences table
*/

-- Add privacy control columns to user_preferences
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'phone_visible'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN phone_visible boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'email_visible'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN email_visible boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'profile_searchable'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN profile_searchable boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'allow_messages_from'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN allow_messages_from text DEFAULT 'anyone' CHECK (allow_messages_from IN ('anyone', 'verified', 'connections'));
  END IF;
END $$;

-- Add helpful comments
COMMENT ON COLUMN user_preferences.phone_visible IS 'Whether phone number is visible to other users';
COMMENT ON COLUMN user_preferences.email_visible IS 'Whether email is displayed on public profile';
COMMENT ON COLUMN user_preferences.profile_searchable IS 'Whether profile appears in search results and ride matching';
COMMENT ON COLUMN user_preferences.allow_messages_from IS 'Control who can send messages: anyone, verified users only, or connections only';
