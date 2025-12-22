/*
  # Optimize RLS Policies - Auth Initialization (Part 2)

  1. Performance Improvements
    - Wraps auth.uid() calls in SELECT to prevent re-evaluation
    - Significantly improves RLS policy performance at scale

  2. Affected Tables
    - user_challenges
    - two_factor_auth
    - two_factor_recovery_codes
    - two_factor_audit_log
    - notification_preferences
    - saved_searches
*/

-- User Challenges
DROP POLICY IF EXISTS "Users insert own challenges" ON public.user_challenges;
CREATE POLICY "Users insert own challenges" ON public.user_challenges
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own challenges" ON public.user_challenges;
CREATE POLICY "Users update own challenges" ON public.user_challenges
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users view own challenges" ON public.user_challenges;
CREATE POLICY "Users view own challenges" ON public.user_challenges
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Two Factor Auth
DROP POLICY IF EXISTS "Admins can view all 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Admins can view all 2FA settings" ON public.two_factor_auth
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can create own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can create own 2FA settings" ON public.two_factor_auth
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can delete own 2FA settings" ON public.two_factor_auth
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can update own 2FA settings" ON public.two_factor_auth
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own 2FA settings" ON public.two_factor_auth;
CREATE POLICY "Users can view own 2FA settings" ON public.two_factor_auth
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Two Factor Recovery Codes
DROP POLICY IF EXISTS "Users can create own recovery codes" ON public.two_factor_recovery_codes;
CREATE POLICY "Users can create own recovery codes" ON public.two_factor_recovery_codes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own recovery codes" ON public.two_factor_recovery_codes;
CREATE POLICY "Users can update own recovery codes" ON public.two_factor_recovery_codes
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own recovery codes" ON public.two_factor_recovery_codes;
CREATE POLICY "Users can view own recovery codes" ON public.two_factor_recovery_codes
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Two Factor Audit Log
DROP POLICY IF EXISTS "Admins can view all 2FA audit logs" ON public.two_factor_audit_log;
CREATE POLICY "Admins can view all 2FA audit logs" ON public.two_factor_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "Users can view own 2FA audit log" ON public.two_factor_audit_log;
CREATE POLICY "Users can view own 2FA audit log" ON public.two_factor_audit_log
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Notification Preferences
DROP POLICY IF EXISTS "Users insert own notif prefs" ON public.notification_preferences;
CREATE POLICY "Users insert own notif prefs" ON public.notification_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users update own notif prefs" ON public.notification_preferences;
CREATE POLICY "Users update own notif prefs" ON public.notification_preferences
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users view own notif prefs" ON public.notification_preferences;
CREATE POLICY "Users view own notif prefs" ON public.notification_preferences
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Saved Searches
DROP POLICY IF EXISTS "Users can create own saved searches" ON public.saved_searches;
CREATE POLICY "Users can create own saved searches" ON public.saved_searches
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own saved searches" ON public.saved_searches;
CREATE POLICY "Users can delete own saved searches" ON public.saved_searches
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own saved searches" ON public.saved_searches;
CREATE POLICY "Users can update own saved searches" ON public.saved_searches
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own saved searches" ON public.saved_searches;
CREATE POLICY "Users can view own saved searches" ON public.saved_searches
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
