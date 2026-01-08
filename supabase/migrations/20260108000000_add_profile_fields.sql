-- Add missing profile fields for onboarding
-- Created: 2026-01-08

-- =====================================================
-- 1. ADD MISSING COLUMNS TO PROFILES TABLE
-- =====================================================

-- Nationality (for language/cultural matching)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality TEXT;

-- Occupation (helps build trust)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;

-- Smoking policy preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoking_policy TEXT DEFAULT 'no-smoking'
  CHECK (smoking_policy IN ('no-smoking', 'smoking-allowed', 'ask-first'));

-- Pets allowed preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pets_allowed BOOLEAN DEFAULT false;

-- Music preference during rides
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS music_preference TEXT DEFAULT 'any'
  CHECK (music_preference IN ('any', 'quiet', 'radio', 'podcasts'));

-- Conversation level preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS conversation_level TEXT DEFAULT 'chatty'
  CHECK (conversation_level IN ('quiet', 'some-chat', 'chatty'));

-- Luggage size preference
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS luggage_size TEXT DEFAULT 'medium'
  CHECK (luggage_size IN ('small', 'medium', 'large'));

-- Emergency contact information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- =====================================================
-- 2. CREATE INDEXES FOR BETTER QUERIES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_nationality ON profiles(nationality);
CREATE INDEX IF NOT EXISTS idx_profiles_occupation ON profiles(occupation);
CREATE INDEX IF NOT EXISTS idx_profiles_smoking_policy ON profiles(smoking_policy);

-- =====================================================
-- 3. COMMENTS
-- =====================================================

COMMENT ON COLUMN profiles.nationality IS 'User nationality for cultural/language matching';
COMMENT ON COLUMN profiles.occupation IS 'User occupation to help build trust';
COMMENT ON COLUMN profiles.smoking_policy IS 'Ride preference: no-smoking, smoking-allowed, ask-first';
COMMENT ON COLUMN profiles.pets_allowed IS 'Whether user allows pets in rides';
COMMENT ON COLUMN profiles.music_preference IS 'Music preference during rides';
COMMENT ON COLUMN profiles.conversation_level IS 'Preferred conversation level during rides';
COMMENT ON COLUMN profiles.luggage_size IS 'Typical luggage size for rides';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'Emergency contact name';
COMMENT ON COLUMN profiles.emergency_contact_phone IS 'Emergency contact phone number';
