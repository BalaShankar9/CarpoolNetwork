/*
  # Fix Profile and Notification Schema Mismatches

  1. Profiles
    - Add missing columns used by the app (phone_number, city, country, etc.)
    - Backfill phone_number from phone
    - Align photo_verified with profile_verified when available

  2. Notifications
    - Restore notifications.type alongside category
    - Backfill type/category values
    - Add sync trigger and broaden allowed types
*/

-- Add missing profile columns used by the frontend
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'city'
  ) THEN
    ALTER TABLE profiles ADD COLUMN city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'country'
  ) THEN
    ALTER TABLE profiles ADD COLUMN country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'email_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN email_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'photo_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN photo_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'id_verified'
  ) THEN
    ALTER TABLE profiles ADD COLUMN id_verified boolean;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN language text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN timezone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_completion_percentage'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_completion_percentage integer;
  END IF;
END $$;

-- Backfill common values
UPDATE profiles
SET phone_number = phone
WHERE phone_number IS NULL AND phone IS NOT NULL;

UPDATE profiles
SET photo_verified = profile_verified
WHERE photo_verified IS NULL AND profile_verified IS NOT NULL;

-- Ensure notifications.type exists alongside category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'type'
  ) THEN
    ALTER TABLE notifications ADD COLUMN type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'category'
  ) THEN
    ALTER TABLE notifications ADD COLUMN category text;
  END IF;
END $$;

-- Backfill type/category values
UPDATE notifications
SET type = COALESCE(type, category, 'system');

UPDATE notifications
SET category = COALESCE(category, type, 'system');

-- Reset constraints to include friend notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_category_check;

ALTER TABLE notifications ALTER COLUMN type SET DEFAULT 'system';
ALTER TABLE notifications ALTER COLUMN category SET DEFAULT 'system';
ALTER TABLE notifications ALTER COLUMN type SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN category SET NOT NULL;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      'ride-match',
      'booking-request',
      'booking-confirmed',
      'booking-cancelled',
      'message',
      'review',
      'safety-alert',
      'system',
      'friend-request',
      'friend-accepted',
      'info',
      'success',
      'warning',
      'error'
    )
  );

ALTER TABLE notifications
  ADD CONSTRAINT notifications_category_check CHECK (
    category IN (
      'ride-match',
      'booking-request',
      'booking-confirmed',
      'booking-cancelled',
      'message',
      'review',
      'safety-alert',
      'system',
      'friend-request',
      'friend-accepted',
      'info',
      'success',
      'warning',
      'error'
    )
  );

-- Keep type/category aligned for new writes
CREATE OR REPLACE FUNCTION sync_notification_type_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type IS NULL AND NEW.category IS NOT NULL THEN
    NEW.type := NEW.category;
  ELSIF NEW.category IS NULL AND NEW.type IS NOT NULL THEN
    NEW.category := NEW.type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_notification_type_category ON notifications;
CREATE TRIGGER trg_sync_notification_type_category
BEFORE INSERT OR UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION sync_notification_type_category();
