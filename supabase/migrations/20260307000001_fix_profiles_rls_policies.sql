-- Fix profiles RLS policies: restrict to authenticated users only
-- Addresses two issues from security audit:
-- 1. profiles_owner_insert missing TO authenticated
-- 2. profiles_public_read exposes all data to anonymous (anon) role

-- Drop and recreate INSERT policy with TO authenticated
DROP POLICY IF EXISTS "profiles_owner_insert" ON public.profiles;
CREATE POLICY "profiles_owner_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Drop and recreate SELECT policy with TO authenticated
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_public_read"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Also clean up any stale policy names from older migrations
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
