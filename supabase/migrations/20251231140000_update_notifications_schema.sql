-- Update notifications schema to match new requirements
-- Change is_read to read_at, update types, remove title/message in favor of data jsonb

-- Add read_at column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- Update existing is_read to read_at
UPDATE notifications SET read_at = now() WHERE is_read = true;

-- Drop is_read column
ALTER TABLE notifications DROP COLUMN IF EXISTS is_read;

-- Drop title and message columns as we'll use data jsonb
ALTER TABLE notifications DROP COLUMN IF EXISTS title;
ALTER TABLE notifications DROP COLUMN IF EXISTS message;

-- Update type check constraint to include new types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'NEW_MESSAGE',
    'FRIEND_REQUEST',
    'FRIEND_REQUEST_ACCEPTED',
    'FORUM_REPLY',
    'FORUM_MENTION',
    'RIDE_MATCH',
    'BOOKING_REQUEST',
    'BOOKING_CONFIRMED',
    'BOOKING_CANCELLED',
    'REVIEW',
    'SAFETY_ALERT',
    'SYSTEM'
  )
);

-- Update indexes
DROP INDEX IF EXISTS idx_notifications_is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NOT NULL;