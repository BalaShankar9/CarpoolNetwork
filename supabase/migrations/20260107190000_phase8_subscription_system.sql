-- Phase 8: Subscription Management System
-- Platform access subscriptions (monthly, quarterly, semi-annual, annual)
-- No ride payment tracking - just subscription billing

-- =====================================================
-- 1. SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_name TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'plus', 'pro')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  stripe_price_id TEXT,
  stripe_product_id TEXT,
  description TEXT,
  trial_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription plans
INSERT INTO subscription_plans (plan_name, tier, billing_cycle, price, discount_percent, description, features, trial_days) VALUES
  -- Free tier (always available)
  ('Free Forever', 'free', 'monthly', 0, 0, 'Essential carpooling features for everyone', 
   '["Unlimited ride search", "Basic matching", "In-app messaging", "Community features", "Safety features"]'::jsonb, 
   0),
  
  -- Paid plans
  ('Monthly Access', 'plus', 'monthly', 5.00, 0, 'Full platform access - billed monthly',
   '["Everything in Free", "Priority matching", "Advanced analytics", "Ad-free experience", "Extended booking"]'::jsonb,
   7),
  
  ('Quarterly Access', 'plus', 'quarterly', 13.50, 10, '3 months access - save 10%',
   '["Everything in Free", "Priority matching", "Advanced analytics", "Ad-free experience", "Extended booking"]'::jsonb,
   7),
  
  ('Semi-Annual Access', 'plus', 'semi_annual', 24.00, 20, '6 months access - save 20%',
   '["Everything in Free", "Priority matching", "Advanced analytics", "Ad-free experience", "Extended booking"]'::jsonb,
   7),
  
  ('Annual Access', 'plus', 'annual', 42.00, 30, '12 months access - save 30%',
   '["Everything in Free", "Priority matching", "Advanced analytics", "Ad-free experience", "Extended booking"]'::jsonb,
   7)
ON CONFLICT (plan_name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- =====================================================
-- 2. USER SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'plus', 'pro')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  
  -- Trial tracking
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Subscription period
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Stripe integration
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  
  -- Metadata
  auto_renew BOOLEAN DEFAULT true,
  payment_method TEXT DEFAULT 'card', -- card, bank_transfer, cash, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active subscription per user
  UNIQUE(user_id, status) WHERE status IN ('trial', 'active')
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON user_memberships(status);
CREATE INDEX IF NOT EXISTS idx_user_memberships_period_end ON user_memberships(current_period_end) WHERE status IN ('active', 'trial');
CREATE INDEX IF NOT EXISTS idx_user_memberships_stripe ON user_memberships(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

-- =====================================================
-- 3. SUBSCRIPTION PAYMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES user_memberships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method TEXT DEFAULT 'card',
  
  -- Stripe integration
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_charge_id TEXT,
  
  -- Refund tracking
  refunded_amount NUMERIC(10, 2) DEFAULT 0,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  
  -- Payment details
  billing_reason TEXT, -- subscription_create, subscription_cycle, etc.
  invoice_number TEXT,
  receipt_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created ON subscription_payments(created_at DESC);

-- =====================================================
-- 4. SUBSCRIPTION EVENTS LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES user_memberships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- created, renewed, cancelled, expired, upgraded, downgraded, payment_failed, etc.
  event_data JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id), -- admin who performed action (if manual)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_user ON subscription_events(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);

-- =====================================================
-- 5. SUBSCRIPTION ANALYTICS FUNCTIONS
-- =====================================================

-- Function: Get subscription overview stats
CREATE OR REPLACE FUNCTION get_subscription_stats()
RETURNS TABLE (
  metric TEXT,
  value BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_users BIGINT;
  active_subs BIGINT;
  trial_subs BIGINT;
  expired_subs BIGINT;
  cancelled_subs BIGINT;
BEGIN
  -- Get total user count
  SELECT COUNT(*) INTO total_users FROM profiles;
  
  -- Get subscription counts
  SELECT COUNT(*) INTO active_subs FROM user_memberships WHERE status = 'active';
  SELECT COUNT(*) INTO trial_subs FROM user_memberships WHERE status = 'trial';
  SELECT COUNT(*) INTO expired_subs FROM user_memberships WHERE status = 'expired';
  SELECT COUNT(*) INTO cancelled_subs FROM user_memberships WHERE status = 'cancelled';
  
  RETURN QUERY
  SELECT 'total_users'::TEXT, total_users, 100.0
  UNION ALL
  SELECT 'active_subscriptions'::TEXT, active_subs, 
    CASE WHEN total_users > 0 THEN (active_subs::NUMERIC / total_users * 100) ELSE 0 END
  UNION ALL
  SELECT 'trial_subscriptions'::TEXT, trial_subs,
    CASE WHEN total_users > 0 THEN (trial_subs::NUMERIC / total_users * 100) ELSE 0 END
  UNION ALL
  SELECT 'expired_subscriptions'::TEXT, expired_subs,
    CASE WHEN total_users > 0 THEN (expired_subs::NUMERIC / total_users * 100) ELSE 0 END
  UNION ALL
  SELECT 'cancelled_subscriptions'::TEXT, cancelled_subs,
    CASE WHEN total_users > 0 THEN (cancelled_subs::NUMERIC / total_users * 100) ELSE 0 END;
END;
$$;

-- Function: Get Monthly Recurring Revenue (MRR)
CREATE OR REPLACE FUNCTION get_mrr_breakdown()
RETURNS TABLE (
  billing_cycle TEXT,
  subscriber_count BIGINT,
  monthly_revenue NUMERIC,
  annual_revenue NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    um.billing_cycle,
    COUNT(*)::BIGINT as subscriber_count,
    CASE 
      WHEN um.billing_cycle = 'monthly' THEN SUM(sp.price)
      WHEN um.billing_cycle = 'quarterly' THEN SUM(sp.price / 3)
      WHEN um.billing_cycle = 'semi_annual' THEN SUM(sp.price / 6)
      WHEN um.billing_cycle = 'annual' THEN SUM(sp.price / 12)
    END as monthly_revenue,
    CASE 
      WHEN um.billing_cycle = 'monthly' THEN SUM(sp.price * 12)
      WHEN um.billing_cycle = 'quarterly' THEN SUM(sp.price * 4)
      WHEN um.billing_cycle = 'semi_annual' THEN SUM(sp.price * 2)
      WHEN um.billing_cycle = 'annual' THEN SUM(sp.price)
    END as annual_revenue
  FROM user_memberships um
  JOIN subscription_plans sp ON um.plan_id = sp.id
  WHERE um.status IN ('active', 'trial')
  GROUP BY um.billing_cycle
  ORDER BY monthly_revenue DESC;
END;
$$;

-- Function: Get revenue summary for date range
CREATE OR REPLACE FUNCTION get_revenue_summary(start_date TIMESTAMPTZ, end_date TIMESTAMPTZ)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_payments BIGINT,
  successful_payments BIGINT,
  failed_payments BIGINT,
  refunded_amount NUMERIC,
  average_payment NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as total_revenue,
    COUNT(*)::BIGINT as total_payments,
    COUNT(CASE WHEN status = 'succeeded' THEN 1 END)::BIGINT as successful_payments,
    COUNT(CASE WHEN status = 'failed' THEN 1 END)::BIGINT as failed_payments,
    COALESCE(SUM(refunded_amount), 0) as refunded_amount,
    COALESCE(AVG(CASE WHEN status = 'succeeded' THEN amount END), 0) as average_payment
  FROM subscription_payments
  WHERE created_at BETWEEN start_date AND end_date;
END;
$$;

-- Function: Get subscription churn rate
CREATE OR REPLACE FUNCTION get_churn_rate(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  total_subscribers_start BIGINT,
  cancelled_subscriptions BIGINT,
  churn_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_count BIGINT;
  cancel_count BIGINT;
BEGIN
  -- Get subscriber count at start of period
  SELECT COUNT(*) INTO start_count
  FROM user_memberships
  WHERE created_at <= NOW() - (days_back || ' days')::INTERVAL
    AND status IN ('active', 'trial');
  
  -- Get cancellations during period
  SELECT COUNT(*) INTO cancel_count
  FROM user_memberships
  WHERE cancelled_at >= NOW() - (days_back || ' days')::INTERVAL
    AND cancelled_at IS NOT NULL;
  
  RETURN QUERY
  SELECT 
    start_count,
    cancel_count,
    CASE WHEN start_count > 0 
      THEN (cancel_count::NUMERIC / start_count * 100)
      ELSE 0 
    END;
END;
$$;

-- Function: Get expiring subscriptions (for renewal reminders)
CREATE OR REPLACE FUNCTION get_expiring_subscriptions(days_ahead INTEGER DEFAULT 7)
RETURNS TABLE (
  subscription_id UUID,
  user_id UUID,
  user_email TEXT,
  plan_name TEXT,
  expires_at TIMESTAMPTZ,
  days_until_expiry INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    um.id as subscription_id,
    um.user_id,
    p.email as user_email,
    sp.plan_name,
    um.current_period_end as expires_at,
    EXTRACT(DAY FROM (um.current_period_end - NOW()))::INTEGER as days_until_expiry
  FROM user_memberships um
  JOIN profiles p ON um.user_id = p.id
  JOIN subscription_plans sp ON um.plan_id = sp.id
  WHERE um.status = 'active'
    AND um.current_period_end <= NOW() + (days_ahead || ' days')::INTERVAL
    AND um.current_period_end > NOW()
    AND um.auto_renew = false
  ORDER BY um.current_period_end ASC;
END;
$$;

-- Function: Check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_sub BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM user_memberships
    WHERE user_id = p_user_id
      AND status IN ('active', 'trial')
      AND current_period_end > NOW()
  ) INTO has_sub;
  
  RETURN COALESCE(has_sub, false);
END;
$$;

-- =====================================================
-- 6. ADMIN SUBSCRIPTION MANAGEMENT FUNCTIONS
-- =====================================================

-- Function: Manually grant subscription to user
CREATE OR REPLACE FUNCTION grant_subscription(
  p_user_id UUID,
  p_plan_id UUID,
  p_duration_months INTEGER,
  p_admin_id UUID,
  p_reason TEXT DEFAULT 'Manual grant by admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_subscription_id UUID;
  v_plan_tier TEXT;
  v_plan_billing TEXT;
BEGIN
  -- Check if admin
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Only administrators can grant subscriptions';
  END IF;
  
  -- Get plan details
  SELECT tier, billing_cycle INTO v_plan_tier, v_plan_billing
  FROM subscription_plans WHERE id = p_plan_id;
  
  -- Cancel any existing active subscription
  UPDATE user_memberships
  SET status = 'cancelled',
      cancelled_at = NOW(),
      cancellation_reason = 'Replaced by manual grant'
  WHERE user_id = p_user_id
    AND status IN ('active', 'trial');
  
  -- Create new subscription
  INSERT INTO user_memberships (
    user_id, plan_id, tier, status, billing_cycle,
    current_period_start, current_period_end,
    auto_renew, payment_method
  ) VALUES (
    p_user_id, p_plan_id, v_plan_tier, 'active', v_plan_billing,
    NOW(), NOW() + (p_duration_months || ' months')::INTERVAL,
    false, 'manual'
  )
  RETURNING id INTO v_subscription_id;
  
  -- Log event
  INSERT INTO subscription_events (subscription_id, user_id, event_type, event_data, created_by)
  VALUES (
    v_subscription_id, p_user_id, 'manual_grant',
    jsonb_build_object('duration_months', p_duration_months, 'reason', p_reason),
    p_admin_id
  );
  
  -- Log admin action
  INSERT INTO admin_action_logs (
    admin_id, admin_email, action_type, resource_type, resource_id, new_state
  )
  SELECT p_admin_id, email, 'grant_subscription', 'subscription', v_subscription_id,
    jsonb_build_object('user_id', p_user_id, 'plan_id', p_plan_id, 'duration_months', p_duration_months)
  FROM profiles WHERE id = p_admin_id;
  
  RETURN v_subscription_id;
END;
$$;

-- Function: Extend subscription
CREATE OR REPLACE FUNCTION extend_subscription(
  p_subscription_id UUID,
  p_extend_days INTEGER,
  p_admin_id UUID,
  p_reason TEXT DEFAULT 'Extension by admin'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE id = p_admin_id AND is_admin = true) THEN
    RAISE EXCEPTION 'Only administrators can extend subscriptions';
  END IF;
  
  -- Extend subscription
  UPDATE user_memberships
  SET current_period_end = current_period_end + (p_extend_days || ' days')::INTERVAL,
      updated_at = NOW()
  WHERE id = p_subscription_id;
  
  -- Log event
  INSERT INTO subscription_events (subscription_id, user_id, event_type, event_data, created_by)
  SELECT p_subscription_id, user_id, 'extended',
    jsonb_build_object('days_added', p_extend_days, 'reason', p_reason),
    p_admin_id
  FROM user_memberships WHERE id = p_subscription_id;
  
  RETURN true;
END;
$$;

-- =====================================================
-- 7. RLS POLICIES
-- =====================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Subscription plans: Public read, admin write
CREATE POLICY "Anyone can view active subscription plans"
  ON subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON subscription_plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- User memberships: Users see their own, admins see all
CREATE POLICY "Users can view their own subscriptions"
  ON user_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions"
  ON user_memberships FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage all subscriptions"
  ON user_memberships FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Subscription payments: Users see their own, admins see all
CREATE POLICY "Users can view their own payments"
  ON subscription_payments FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all payments"
  ON subscription_payments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

CREATE POLICY "Admins can manage payments"
  ON subscription_payments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- Subscription events: Admin only
CREATE POLICY "Admins can view subscription events"
  ON subscription_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true)
  );

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT SELECT ON subscription_plans TO authenticated;
GRANT SELECT ON user_memberships TO authenticated;
GRANT SELECT ON subscription_payments TO authenticated;
GRANT SELECT ON subscription_events TO authenticated;

GRANT EXECUTE ON FUNCTION get_subscription_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_mrr_breakdown() TO authenticated;
GRANT EXECUTE ON FUNCTION get_revenue_summary(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_churn_rate(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_subscriptions(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION has_active_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION grant_subscription(UUID, UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION extend_subscription(UUID, INTEGER, UUID, TEXT) TO authenticated;

-- =====================================================
-- 9. AUTOMATED SUBSCRIPTION EXPIRY (Background Job)
-- =====================================================

-- Function: Expire subscriptions past their end date
CREATE OR REPLACE FUNCTION expire_subscriptions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE user_memberships
    SET status = 'expired',
        updated_at = NOW()
    WHERE status IN ('active', 'trial')
      AND current_period_end < NOW()
      AND auto_renew = false
    RETURNING id, user_id
  )
  SELECT COUNT(*) INTO expired_count FROM expired;
  
  -- Log expiry events
  INSERT INTO subscription_events (subscription_id, user_id, event_type, event_data)
  SELECT id, user_id, 'expired', jsonb_build_object('expired_at', NOW())
  FROM user_memberships
  WHERE status = 'expired' AND updated_at > NOW() - INTERVAL '1 minute';
  
  RETURN expired_count;
END;
$$;

GRANT EXECUTE ON FUNCTION expire_subscriptions() TO authenticated;

-- =====================================================
-- COMPLETED: Phase 8 Subscription System
-- =====================================================

-- Summary:
-- ✅ subscription_plans table (monthly, quarterly, semi-annual, annual)
-- ✅ user_memberships table (subscription tracking)
-- ✅ subscription_payments table (payment history)
-- ✅ subscription_events table (audit log)
-- ✅ Analytics functions (MRR, churn, revenue)
-- ✅ Admin management functions (grant, extend)
-- ✅ RLS policies (user privacy, admin access)
-- ✅ Auto-expiry function for background jobs
