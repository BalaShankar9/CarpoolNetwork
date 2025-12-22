/*
  # Optimize RLS Policies - Auth Initialization (Part 3)

  1. Performance Improvements
    - Wraps auth.uid() calls in SELECT to prevent re-evaluation
    - Significantly improves RLS policy performance at scale

  2. Affected Tables
    - passkey_credentials
    - passenger_search_filters
    - preferred_drivers
    - blocked_users_preferences
    - recurring_ride_templates
    - bug_reports
*/

-- Bug Reports
DROP POLICY IF EXISTS "All authenticated users can submit bug reports" ON public.bug_reports;
CREATE POLICY "All authenticated users can submit bug reports" ON public.bug_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Driver Licenses
DROP POLICY IF EXISTS "Admins can update licenses" ON public.driver_licenses;
CREATE POLICY "Admins can update licenses" ON public.driver_licenses
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

DROP POLICY IF EXISTS "Admins can view all licenses" ON public.driver_licenses;
CREATE POLICY "Admins can view all licenses" ON public.driver_licenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

-- Passkey Credentials
DROP POLICY IF EXISTS "Users can delete own passkey credentials" ON public.passkey_credentials;
CREATE POLICY "Users can delete own passkey credentials" ON public.passkey_credentials
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own passkey credentials" ON public.passkey_credentials;
CREATE POLICY "Users can view own passkey credentials" ON public.passkey_credentials
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Passenger Search Filters
DROP POLICY IF EXISTS "Users can create own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can create own search filters" ON public.passenger_search_filters
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can delete own search filters" ON public.passenger_search_filters
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can update own search filters" ON public.passenger_search_filters
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own search filters" ON public.passenger_search_filters;
CREATE POLICY "Users can view own search filters" ON public.passenger_search_filters
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Preferred Drivers
DROP POLICY IF EXISTS "Users can add preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can add preferred drivers" ON public.preferred_drivers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can remove preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can remove preferred drivers" ON public.preferred_drivers
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can update own preferred drivers" ON public.preferred_drivers
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own preferred drivers" ON public.preferred_drivers;
CREATE POLICY "Users can view own preferred drivers" ON public.preferred_drivers
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Blocked Users Preferences
DROP POLICY IF EXISTS "Users can block other users" ON public.blocked_users_preferences;
CREATE POLICY "Users can block other users" ON public.blocked_users_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unblock users" ON public.blocked_users_preferences;
CREATE POLICY "Users can unblock users" ON public.blocked_users_preferences
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own blocks" ON public.blocked_users_preferences;
CREATE POLICY "Users can update own blocks" ON public.blocked_users_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own blocked users" ON public.blocked_users_preferences;
CREATE POLICY "Users can view own blocked users" ON public.blocked_users_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Recurring Ride Templates
DROP POLICY IF EXISTS "Users can create ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can create ride templates" ON public.recurring_ride_templates
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can delete own ride templates" ON public.recurring_ride_templates
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can update own ride templates" ON public.recurring_ride_templates
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own ride templates" ON public.recurring_ride_templates;
CREATE POLICY "Users can view own ride templates" ON public.recurring_ride_templates
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
