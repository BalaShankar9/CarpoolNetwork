/*
  # Optimize RLS Policies - Auth Initialization (Part 1)

  1. Performance Improvements
    - Wraps auth.uid() calls in SELECT to prevent re-evaluation
    - Significantly improves RLS policy performance at scale
    - Reduces CPU usage for authenticated queries

  2. Affected Tables
    - emergency_alerts
    - emergency_notifications
    - vehicle_insurance
    - vehicles
    - two_factor_auth
    - two_factor_recovery_codes
    - two_factor_audit_log
*/

-- Emergency Alerts
DROP POLICY IF EXISTS "Users can create own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can create own emergency alerts" ON public.emergency_alerts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can read own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can read own emergency alerts" ON public.emergency_alerts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own emergency alerts" ON public.emergency_alerts;
CREATE POLICY "Users can update own emergency alerts" ON public.emergency_alerts
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Emergency Notifications
DROP POLICY IF EXISTS "Users can create alert notifications" ON public.emergency_notifications;
CREATE POLICY "Users can create alert notifications" ON public.emergency_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.emergency_alerts
      WHERE id = emergency_alert_id
      AND user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can read own alert notifications" ON public.emergency_notifications;
CREATE POLICY "Users can read own alert notifications" ON public.emergency_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.emergency_alerts
      WHERE id = emergency_alert_id
      AND user_id = (SELECT auth.uid())
    )
  );

-- Vehicles
DROP POLICY IF EXISTS "Users can delete their own vehicles" ON public.vehicles;
CREATE POLICY "Users can delete their own vehicles" ON public.vehicles
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own vehicles" ON public.vehicles;
CREATE POLICY "Users can insert their own vehicles" ON public.vehicles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own vehicles" ON public.vehicles;
CREATE POLICY "Users can update their own vehicles" ON public.vehicles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view their own vehicles" ON public.vehicles;
CREATE POLICY "Users can view their own vehicles" ON public.vehicles
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
