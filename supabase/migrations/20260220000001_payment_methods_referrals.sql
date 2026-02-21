-- ============================================================================
-- Payment Methods, Referral Codes & Referrals Tables
-- Supports Stripe card vault + referral programme
-- ============================================================================

-- ============================================================================
-- 1. PAYMENT METHODS (Stripe card metadata vault)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          text NOT NULL DEFAULT 'card' CHECK (type IN ('card', 'bank_account', 'wallet')),
  brand         text,
  last4         text NOT NULL,
  expiry_month  smallint,
  expiry_year   smallint,
  is_default    boolean NOT NULL DEFAULT false,
  stripe_payment_method_id text UNIQUE NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON public.payment_methods(user_id, is_default);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own payment methods
CREATE POLICY "payment_methods: owner select"
  ON public.payment_methods FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "payment_methods: owner insert"
  ON public.payment_methods FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods: owner update"
  ON public.payment_methods FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_methods: owner delete"
  ON public.payment_methods FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Payment receipts table
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id     uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  receipt_number text NOT NULL UNIQUE,
  pdf_url        text,
  email_sent     boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_receipts: owner select"
  ON public.payment_receipts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.payments p
      WHERE p.id = payment_id
        AND (p.payer_id = auth.uid() OR p.payee_id = auth.uid())
    )
  );

-- ============================================================================
-- 2. REFERRAL CODES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code        text NOT NULL UNIQUE,
  usage_count integer NOT NULL DEFAULT 0,
  max_uses    integer,
  expires_at  timestamptz,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code    ON public.referral_codes(code);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referral_codes: owner select"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "referral_codes: owner insert"
  ON public.referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "referral_codes: owner update"
  ON public.referral_codes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Allow any authenticated user to look up a code by value (for sign-up flow)
CREATE POLICY "referral_codes: lookup by code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

-- ============================================================================
-- 3. REFERRALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.referrals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rewarded')),
  reward_type   text CHECK (reward_type IN ('badge', 'premium_days', 'featured_ride')),
  reward_value  integer,
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  UNIQUE (referred_id)  -- each user can only be referred once
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status      ON public.referrals(status);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "referrals: referrer select"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "referrals: insert on signup"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (referred_id = auth.uid());

-- ============================================================================
-- 4. RIDE FLAGS (for admin "Flag for review" action)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ride_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id     uuid NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  flagged_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved', 'dismissed')),
  notes       text,
  resolved_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ride_flags_ride_id ON public.ride_flags(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_flags_status  ON public.ride_flags(status);

ALTER TABLE public.ride_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ride_flags: admin all"
  ON public.ride_flags
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator')
    )
  );

-- ============================================================================
-- 5. STRIPE CUSTOMER IDS on profiles (convenience column)
-- ============================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
