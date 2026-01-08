-- Migration: Fix profile_public_v view
-- This view provides public-safe profile data without exposing sensitive information

-- Drop existing view if exists to recreate with proper columns
DROP VIEW IF EXISTS public.profile_public_v;

-- Create the public profile view with all necessary columns
CREATE VIEW public.profile_public_v AS
SELECT
  id,
  full_name,
  avatar_url,
  profile_photo_url,
  created_at,
  country_of_residence,
  country,
  city,
  bio,
  languages,
  phone_verified,
  email_verified,
  photo_verified,
  id_verified,
  profile_verified,
  preferred_contact_method,
  allow_inhouse_chat,
  allow_whatsapp_chat,
  trust_score,
  average_rating,
  reliability_score,
  total_rides_offered,
  total_rides_taken,
  total_bookings,
  cancelled_bookings,
  last_minute_cancellations,
  phone_visibility,
  whatsapp_visibility,
  gender,
  date_of_birth,
  nationality,
  occupation,
  smoking_policy,
  pets_allowed,
  music_preference,
  conversation_level,
  luggage_size
FROM public.profiles;

-- Grant permissions
GRANT SELECT ON public.profile_public_v TO anon, authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.profile_public_v IS 'Public-safe profile view that excludes phone numbers and sensitive data';
