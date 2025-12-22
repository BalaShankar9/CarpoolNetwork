/*
  # Add RLS Policies for Cache Tables

  1. Security
    - Adds RLS policies for cache_entries and cache_stats
    - Restricts access to admin users only
    - Prevents unauthorized access to cache data

  2. Tables Affected
    - cache_entries
    - cache_stats
*/

-- Cache Entries - Admin Only Access
CREATE POLICY "Admins can view cache entries" ON public.cache_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert cache entries" ON public.cache_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can update cache entries" ON public.cache_entries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete cache entries" ON public.cache_entries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Cache Stats - Admin Only Access
CREATE POLICY "Admins can view cache stats" ON public.cache_stats
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert cache stats" ON public.cache_stats
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can update cache stats" ON public.cache_stats
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete cache stats" ON public.cache_stats
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );
