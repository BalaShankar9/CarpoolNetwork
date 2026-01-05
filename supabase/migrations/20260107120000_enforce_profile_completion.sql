/*
  # Enforce Profile Completeness and Public Profile View

  1. Profiles
    - Relax NOT NULL constraints for auth-provider flexibility
    - Add required profile fields and privacy settings
    - Backfill missing profile rows
    - Normalize phone/country fields
    - Create public-safe profile view

  2. Enforcement
    - Add profile completeness helper
    - Enforce completeness for ride posting and booking
*/

-- Allow auth providers without email/full_name at signup
ALTER TABLE public.profiles
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN full_name DROP NOT NULL;

-- Add required profile fields (if missing)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS country_of_residence text,
  ADD COLUMN IF NOT EXISTS languages text[],
  ADD COLUMN IF NOT EXISTS whatsapp_e164 text,
  ADD COLUMN IF NOT EXISTS phone_visibility text DEFAULT 'ride_only',
  ADD COLUMN IF NOT EXISTS whatsapp_visibility text DEFAULT 'friends',
  ADD COLUMN IF NOT EXISTS ethnicity text,
  ADD COLUMN IF NOT EXISTS ethnicity_consent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ethnicity_visibility text DEFAULT 'none';

-- Enforce defaults and allowed values
UPDATE public.profiles SET phone_verified = false WHERE phone_verified IS NULL;
UPDATE public.profiles SET ethnicity_consent = false WHERE ethnicity_consent IS NULL;
UPDATE public.profiles SET phone_visibility = 'ride_only' WHERE phone_visibility IS NULL;
UPDATE public.profiles SET whatsapp_visibility = 'friends' WHERE whatsapp_visibility IS NULL;
UPDATE public.profiles SET ethnicity_visibility = 'none' WHERE ethnicity_visibility IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN phone_verified SET NOT NULL,
  ALTER COLUMN ethnicity_consent SET NOT NULL,
  ALTER COLUMN phone_visibility SET NOT NULL,
  ALTER COLUMN whatsapp_visibility SET NOT NULL,
  ALTER COLUMN ethnicity_visibility SET NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_visibility_check
  CHECK (phone_visibility IN ('none', 'friends', 'ride_only', 'anyone'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_whatsapp_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_whatsapp_visibility_check
  CHECK (whatsapp_visibility IN ('none', 'friends', 'ride_only', 'anyone'));

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_ethnicity_visibility_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_ethnicity_visibility_check
  CHECK (ethnicity_visibility IN ('none', 'friends', 'anyone'));

-- Map legacy privacy field into new visibility if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'privacy_phone_visibility'
  ) THEN
    UPDATE public.profiles
    SET phone_visibility = CASE privacy_phone_visibility
      WHEN 'MATCH_ONLY' THEN 'ride_only'
      WHEN 'FRIENDS_ONLY' THEN 'friends'
      WHEN 'NEVER' THEN 'none'
      ELSE phone_visibility
    END
    WHERE privacy_phone_visibility IS NOT NULL;
  END IF;
END $$;

-- Backfill phone_e164 and whatsapp_e164 from legacy fields
UPDATE public.profiles
SET phone_e164 = phone
WHERE phone_e164 IS NULL
  AND phone IS NOT NULL
  AND phone LIKE '+%';

UPDATE public.profiles
SET phone_e164 = phone_number
WHERE phone_e164 IS NULL
  AND phone_number IS NOT NULL
  AND phone_number LIKE '+%';

UPDATE public.profiles
SET whatsapp_e164 = whatsapp_number
WHERE whatsapp_e164 IS NULL
  AND whatsapp_number IS NOT NULL
  AND whatsapp_number LIKE '+%';

-- Keep country and country_of_residence aligned
UPDATE public.profiles
SET country_of_residence = country
WHERE country_of_residence IS NULL
  AND country IS NOT NULL;

UPDATE public.profiles
SET country = country_of_residence
WHERE country IS NULL
  AND country_of_residence IS NOT NULL;

-- Indexes for required fields
CREATE INDEX IF NOT EXISTS idx_profiles_country_of_residence ON public.profiles(country_of_residence);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON public.profiles(full_name);

-- Storage bucket for avatars (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  3145728,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- Auto-create profile on auth.users signup (all methods)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, phone_e164, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'user_name',
      CASE WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1) ELSE NULL END
    ),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.phone,
    NEW.phone
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    phone_e164 = COALESCE(public.profiles.phone_e164, EXCLUDED.phone_e164),
    phone = COALESCE(public.profiles.phone, EXCLUDED.phone);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for existing users
INSERT INTO public.profiles (id, email, full_name, avatar_url, phone_e164, phone)
SELECT
  u.id,
  u.email,
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'user_name',
    CASE WHEN u.email IS NOT NULL THEN split_part(u.email, '@', 1) ELSE NULL END
  ),
  u.raw_user_meta_data->>'avatar_url',
  u.phone,
  u.phone
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Profile completeness helper
CREATE OR REPLACE FUNCTION public.is_profile_complete(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE((
    SELECT
      COALESCE(length(trim(full_name)) >= 2, false)
      AND (
        avatar_url IS NOT NULL OR profile_photo_url IS NOT NULL
      )
      AND phone_e164 IS NOT NULL
      AND phone_verified = true
      AND (
        country_of_residence IS NOT NULL OR country IS NOT NULL
      )
    FROM public.profiles
    WHERE id = p_user_id
  ), false);
$$;

-- Public-safe profile view (no phone numbers)
CREATE OR REPLACE VIEW public.profile_public_v AS
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
  whatsapp_visibility
FROM public.profiles;

GRANT SELECT ON public.profile_public_v TO anon, authenticated;

-- Helper for phone visibility checks
CREATE OR REPLACE FUNCTION public.can_view_phone(p_viewer uuid, p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visibility text;
BEGIN
  IF p_viewer IS NULL OR p_owner IS NULL THEN
    RETURN false;
  END IF;

  IF p_viewer = p_owner THEN
    RETURN true;
  END IF;

  SELECT phone_visibility INTO v_visibility
  FROM public.profiles
  WHERE id = p_owner;

  IF v_visibility = 'anyone' THEN
    RETURN true;
  ELSIF v_visibility = 'friends' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.friendships f
      WHERE f.user_a = LEAST(p_viewer, p_owner)
        AND f.user_b = GREATEST(p_viewer, p_owner)
    );
  ELSIF v_visibility = 'ride_only' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.rides r
      JOIN public.ride_bookings rb ON rb.ride_id = r.id
      WHERE rb.status IN ('confirmed', 'active', 'completed')
        AND (
          (r.driver_id = p_owner AND rb.passenger_id = p_viewer)
          OR (r.driver_id = p_viewer AND rb.passenger_id = p_owner)
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.rides r
      JOIN public.ride_requests rr ON rr.ride_id = r.id
      WHERE rr.status IN ('ACCEPTED_BY_DRIVER', 'CONFIRMED')
        AND (
          (r.driver_id = p_owner AND rr.rider_id = p_viewer)
          OR (r.driver_id = p_viewer AND rr.rider_id = p_owner)
        )
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_view_phone(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_view_phone(uuid, uuid) TO authenticated;

-- Enforce profile completeness for posting rides and requesting seats
DROP POLICY IF EXISTS "Users can insert own rides" ON public.rides;
CREATE POLICY "Users can insert own rides"
  ON public.rides FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = driver_id AND public.is_profile_complete(auth.uid()));

DROP POLICY IF EXISTS "Drivers can update own rides" ON public.rides;
CREATE POLICY "Drivers can update own rides"
  ON public.rides FOR UPDATE
  TO authenticated
  USING (auth.uid() = driver_id)
  WITH CHECK (auth.uid() = driver_id AND public.is_profile_complete(auth.uid()));

DROP POLICY IF EXISTS "Users can insert own bookings" ON public.ride_bookings;
CREATE POLICY "Users can insert own bookings"
  ON public.ride_bookings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = passenger_id AND public.is_profile_complete(auth.uid()));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ride_requests'
      AND column_name = 'rider_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Riders can create ride requests" ON public.ride_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create ride requests" ON public.ride_requests';
    EXECUTE 'CREATE POLICY "Riders can create ride requests" ON public.ride_requests FOR INSERT TO authenticated WITH CHECK (rider_id = auth.uid() AND public.is_profile_complete(auth.uid()))';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'ride_requests'
      AND column_name = 'requester_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Riders can create ride requests" ON public.ride_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can create ride requests" ON public.ride_requests';
    EXECUTE 'CREATE POLICY "Authenticated users can create ride requests" ON public.ride_requests FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() AND public.is_profile_complete(auth.uid()))';
  END IF;
END $$;
