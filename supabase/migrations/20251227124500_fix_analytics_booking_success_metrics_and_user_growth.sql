/*
  # Fix analytics function ambiguity and booking success metrics recursion

  1. get_user_growth()
    - Avoid ambiguous column reference by renaming internal alias.
  2. booking_success_metrics
    - Rebuild view to select from a SECURITY DEFINER helper that bypasses RLS.
*/

-- Fix get_user_growth() ambiguous new_users reference
CREATE OR REPLACE FUNCTION public.get_user_growth(period_days INTEGER DEFAULT 30)
RETURNS TABLE (date DATE, new_users BIGINT, cumulative_users BIGINT)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH daily_signups AS (
    SELECT DATE(created_at) AS signup_date, COUNT(*) AS signup_count
    FROM profiles
    WHERE created_at >= NOW() - (period_days || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY DATE(created_at)
  )
  SELECT
    signup_date AS date,
    signup_count AS new_users,
    SUM(signup_count) OVER (ORDER BY signup_date)::bigint AS cumulative_users
  FROM daily_signups;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_growth(integer) TO authenticated;

-- Rebuild booking_success_metrics using a definer helper to avoid recursion
CREATE OR REPLACE FUNCTION public.get_booking_success_metrics()
RETURNS TABLE (
  confirmed_bookings BIGINT,
  pending_bookings BIGINT,
  cancelled_bookings BIGINT,
  total_bookings BIGINT,
  confirmation_rate NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
SET row_security TO off
AS $$
  SELECT
    COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_bookings,
    COUNT(*) AS total_bookings,
    ROUND(
      (COUNT(*) FILTER (WHERE status = 'confirmed')::DECIMAL / NULLIF(COUNT(*), 0) * 100),
      2
    ) AS confirmation_rate
  FROM ride_bookings
  WHERE created_at >= NOW() - INTERVAL '30 days';
$$;

CREATE OR REPLACE VIEW public.booking_success_metrics AS
SELECT * FROM public.get_booking_success_metrics();

GRANT EXECUTE ON FUNCTION public.get_booking_success_metrics() TO authenticated;
GRANT SELECT ON public.booking_success_metrics TO authenticated;


