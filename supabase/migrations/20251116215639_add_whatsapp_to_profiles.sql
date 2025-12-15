/*
  # Add WhatsApp Integration to Profiles

  1. Changes
    - Add `whatsapp_number` column to profiles table
    - Add `preferred_contact_method` enum (in_app, whatsapp, both)
    - Add index for efficient lookups

  2. Purpose
    - Allow users to share WhatsApp numbers for direct contact
    - Give users choice between in-app messaging and WhatsApp
    - Enable quick WhatsApp integration from ride details
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN whatsapp_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'preferred_contact_method'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_contact_method text DEFAULT 'both' CHECK (preferred_contact_method IN ('in_app', 'whatsapp', 'both'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON profiles(whatsapp_number) WHERE whatsapp_number IS NOT NULL;
