-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 009: Payments, Subscriptions, and Referrals
-- ============================================================================
-- Ride costs, payments, payment splits, payment methods, receipts,
-- subscription plans, subscriptions, referrals, and memberships.
--
-- Depends on:
--   001_extensions_and_utils.sql  (subscription_status ENUM,
--                                  update_updated_at_column(), is_admin())
--   002_core_profiles_and_auth.sql (profiles table)
--   004_rides_bookings_requests.sql (rides, ride_bookings tables)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. ride_costs
-- --------------------------------------------------------------------------
CREATE TABLE ride_costs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id         uuid NOT NULL UNIQUE,  -- FK to rides (created in 004)
    total_cost      numeric(10,2),
    currency        text DEFAULT 'GBP',
    cost_per_km     numeric(10,2),
    fuel_cost       numeric(10,2),
    toll_cost       numeric(10,2),
    parking_cost    numeric(10,2),
    other_costs     numeric(10,2),
    cost_notes      text,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1b. payments
-- --------------------------------------------------------------------------
CREATE TABLE payments (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id                 uuid,  -- FK to rides (created in 004)
    booking_id              uuid,  -- FK to ride_bookings (created in 004)
    payer_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    payee_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount                  numeric(10,2) NOT NULL,
    currency                text DEFAULT 'GBP',
    status                  text NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    payment_method          text,
    transaction_reference   text,
    paid_at                 timestamptz,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1c. payment_splits
-- --------------------------------------------------------------------------
CREATE TABLE payment_splits (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id         uuid NOT NULL,    -- FK to rides (created in 004)
    booking_id      uuid NOT NULL,    -- FK to ride_bookings (created in 004)
    passenger_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount_due      numeric(10,2) NOT NULL,
    distance_factor numeric,
    seats_factor    numeric,
    calculated_at   timestamptz DEFAULT now(),
    created_at      timestamptz DEFAULT now(),
    UNIQUE (ride_id, booking_id)
);

-- --------------------------------------------------------------------------
-- 1d. payment_methods
-- --------------------------------------------------------------------------
CREATE TABLE payment_methods (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_payment_method_id    text,
    type                        text,
    last_four                   text,
    brand                       text,
    is_default                  boolean DEFAULT false,
    created_at                  timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1e. payment_receipts
-- --------------------------------------------------------------------------
CREATE TABLE payment_receipts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    receipt_url     text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. subscription_plans
-- --------------------------------------------------------------------------
CREATE TABLE subscription_plans (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    stripe_price_id text,
    price           numeric NOT NULL,
    interval        text NOT NULL,
    features        jsonb,
    is_active       boolean DEFAULT true,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1g. subscriptions
-- --------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    plan_id                     uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
    stripe_subscription_id      text,
    status                      subscription_status NOT NULL DEFAULT 'active',
    current_period_start        timestamptz,
    current_period_end          timestamptz,
    cancel_at_period_end        boolean DEFAULT false,
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. subscription_events
-- --------------------------------------------------------------------------
CREATE TABLE subscription_events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    event_type      text NOT NULL,
    metadata        jsonb,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1i. subscription_payments
-- --------------------------------------------------------------------------
CREATE TABLE subscription_payments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id     uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount              numeric NOT NULL,
    status              text NOT NULL,
    stripe_invoice_id   text,
    paid_at             timestamptz,
    created_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1j. referral_codes
-- --------------------------------------------------------------------------
CREATE TABLE referral_codes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    code            text NOT NULL UNIQUE,
    uses_count      integer DEFAULT 0,
    max_uses        integer,
    reward_type     text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1k. referrals
-- --------------------------------------------------------------------------
CREATE TABLE referrals (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    referred_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    code            text NOT NULL,
    status          text,
    reward_granted  boolean DEFAULT false,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1l. user_memberships
-- --------------------------------------------------------------------------
CREATE TABLE user_memberships (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    membership_type     text NOT NULL,
    started_at          timestamptz DEFAULT now(),
    expires_at          timestamptz,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now()
);

-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- ride_costs
CREATE INDEX idx_ride_costs_ride              ON ride_costs (ride_id);

-- payments
CREATE INDEX idx_payments_ride                ON payments (ride_id);
CREATE INDEX idx_payments_booking             ON payments (booking_id);
CREATE INDEX idx_payments_payer               ON payments (payer_id);
CREATE INDEX idx_payments_payee               ON payments (payee_id);
CREATE INDEX idx_payments_status              ON payments (status);
CREATE INDEX idx_payments_created_at          ON payments (created_at DESC);

-- payment_splits
CREATE INDEX idx_payment_splits_ride          ON payment_splits (ride_id);
CREATE INDEX idx_payment_splits_booking       ON payment_splits (booking_id);
CREATE INDEX idx_payment_splits_passenger     ON payment_splits (passenger_id);

-- payment_methods
CREATE INDEX idx_payment_methods_user         ON payment_methods (user_id);

-- payment_receipts
CREATE INDEX idx_payment_receipts_payment     ON payment_receipts (payment_id);

-- subscription_plans
CREATE INDEX idx_subscription_plans_active    ON subscription_plans (is_active) WHERE is_active = true;

-- subscriptions
CREATE INDEX idx_subscriptions_user           ON subscriptions (user_id);
CREATE INDEX idx_subscriptions_plan           ON subscriptions (plan_id);
CREATE INDEX idx_subscriptions_status         ON subscriptions (status);
CREATE INDEX idx_subscriptions_stripe         ON subscriptions (stripe_subscription_id);

-- subscription_events
CREATE INDEX idx_subscription_events_sub      ON subscription_events (subscription_id);
CREATE INDEX idx_subscription_events_created  ON subscription_events (created_at DESC);

-- subscription_payments
CREATE INDEX idx_subscription_payments_sub    ON subscription_payments (subscription_id);
CREATE INDEX idx_subscription_payments_status ON subscription_payments (status);

-- referral_codes
CREATE INDEX idx_referral_codes_user          ON referral_codes (user_id);
CREATE INDEX idx_referral_codes_code          ON referral_codes (code);

-- referrals
CREATE INDEX idx_referrals_referrer           ON referrals (referrer_id);
CREATE INDEX idx_referrals_referred           ON referrals (referred_id);
CREATE INDEX idx_referrals_code               ON referrals (code);

-- user_memberships
CREATE INDEX idx_user_memberships_user        ON user_memberships (user_id);
CREATE INDEX idx_user_memberships_active      ON user_memberships (is_active) WHERE is_active = true;

-- ==========================================================================
-- 3. TRIGGERS
-- ==========================================================================

CREATE TRIGGER trg_ride_costs_updated_at
    BEFORE UPDATE ON ride_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================================================
-- 4. FUNCTIONS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- calculate_payment_split — calculates a passenger's share for a ride booking
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION calculate_payment_split(p_ride_id uuid, p_booking_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_total_cost numeric;
    v_total_seats integer;
    v_passenger_seats integer;
    v_split_amount numeric;
BEGIN
    -- Get total ride cost
    SELECT total_cost INTO v_total_cost
    FROM ride_costs
    WHERE ride_id = p_ride_id;

    IF v_total_cost IS NULL THEN
        RETURN 0;
    END IF;

    -- Get total booked seats for this ride
    SELECT COALESCE(SUM(seats_booked), 0) INTO v_total_seats
    FROM ride_bookings
    WHERE ride_id = p_ride_id
      AND status IN ('confirmed', 'completed');

    IF v_total_seats = 0 THEN
        RETURN 0;
    END IF;

    -- Get this booking's seats
    SELECT COALESCE(seats_booked, 1) INTO v_passenger_seats
    FROM ride_bookings
    WHERE id = p_booking_id;

    -- Calculate proportional share
    v_split_amount := ROUND((v_total_cost * v_passenger_seats / v_total_seats)::numeric, 2);

    RETURN v_split_amount;
END;
$$;

-- --------------------------------------------------------------------------
-- auto_calculate_payment_splits — trigger to auto-compute splits
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_calculate_payment_splits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ride_id uuid;
    v_booking record;
    v_total_cost numeric;
    v_total_seats integer;
BEGIN
    v_ride_id := NEW.ride_id;

    -- Get total ride cost
    SELECT total_cost INTO v_total_cost
    FROM ride_costs
    WHERE ride_id = v_ride_id;

    IF v_total_cost IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get total booked seats
    SELECT COALESCE(SUM(seats_booked), 0) INTO v_total_seats
    FROM ride_bookings
    WHERE ride_id = v_ride_id
      AND status IN ('confirmed', 'completed');

    IF v_total_seats = 0 THEN
        RETURN NEW;
    END IF;

    -- Upsert splits for each confirmed booking
    FOR v_booking IN
        SELECT id, passenger_id, COALESCE(seats_booked, 1) AS seats
        FROM ride_bookings
        WHERE ride_id = v_ride_id
          AND status IN ('confirmed', 'completed')
    LOOP
        INSERT INTO payment_splits (ride_id, booking_id, passenger_id, amount_due, seats_factor, calculated_at)
        VALUES (
            v_ride_id,
            v_booking.id,
            v_booking.passenger_id,
            ROUND((v_total_cost * v_booking.seats / v_total_seats)::numeric, 2),
            v_booking.seats::numeric / v_total_seats,
            now()
        )
        ON CONFLICT (ride_id, booking_id)
        DO UPDATE SET
            amount_due = EXCLUDED.amount_due,
            seats_factor = EXCLUDED.seats_factor,
            calculated_at = now();
    END LOOP;

    RETURN NEW;
END;
$$;

-- Trigger: recalculate splits when ride_costs change
CREATE TRIGGER trg_auto_calculate_splits
    AFTER INSERT OR UPDATE ON ride_costs
    FOR EACH ROW EXECUTE FUNCTION auto_calculate_payment_splits();

-- ==========================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ==========================================================================

ALTER TABLE ride_costs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments                ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_splits          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_memberships        ENABLE ROW LEVEL SECURITY;

-- ==========================================================================
-- 6. RLS POLICIES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- ride_costs — ride participants + admin
-- --------------------------------------------------------------------------
CREATE POLICY ride_costs_select_participant
    ON ride_costs FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = ride_costs.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM ride_bookings rb
            WHERE rb.ride_id = ride_costs.ride_id
              AND rb.passenger_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY ride_costs_insert_driver
    ON ride_costs FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = ride_costs.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
    );

CREATE POLICY ride_costs_update_driver
    ON ride_costs FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = ride_costs.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
    );

CREATE POLICY ride_costs_admin
    ON ride_costs FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY ride_costs_service_role
    ON ride_costs FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- payments — visible to payer/payee + admin
-- --------------------------------------------------------------------------
CREATE POLICY payments_select_participant
    ON payments FOR SELECT TO authenticated
    USING (
        payer_id = (SELECT auth.uid())
        OR payee_id = (SELECT auth.uid())
        OR is_admin()
    );

CREATE POLICY payments_insert_payer
    ON payments FOR INSERT TO authenticated
    WITH CHECK (payer_id = (SELECT auth.uid()));

CREATE POLICY payments_update_participant
    ON payments FOR UPDATE TO authenticated
    USING (
        payer_id = (SELECT auth.uid())
        OR payee_id = (SELECT auth.uid())
    );

CREATE POLICY payments_admin
    ON payments FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY payments_service_role
    ON payments FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- payment_splits — visible to involved parties
-- --------------------------------------------------------------------------
CREATE POLICY payment_splits_select_participant
    ON payment_splits FOR SELECT TO authenticated
    USING (
        passenger_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides r
            WHERE r.id = payment_splits.ride_id
              AND r.driver_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY payment_splits_service_role
    ON payment_splits FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- payment_methods — own only
-- --------------------------------------------------------------------------
CREATE POLICY payment_methods_select_own
    ON payment_methods FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY payment_methods_insert_own
    ON payment_methods FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY payment_methods_update_own
    ON payment_methods FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY payment_methods_delete_own
    ON payment_methods FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY payment_methods_service_role
    ON payment_methods FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- payment_receipts — visible to payment participant
-- --------------------------------------------------------------------------
CREATE POLICY payment_receipts_select_participant
    ON payment_receipts FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM payments p
            WHERE p.id = payment_receipts.payment_id
              AND (p.payer_id = (SELECT auth.uid()) OR p.payee_id = (SELECT auth.uid()))
        )
        OR is_admin()
    );

CREATE POLICY payment_receipts_service_role
    ON payment_receipts FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- subscription_plans — public read, admin write
-- --------------------------------------------------------------------------
CREATE POLICY subscription_plans_select_authenticated
    ON subscription_plans FOR SELECT TO authenticated
    USING (true);

CREATE POLICY subscription_plans_admin
    ON subscription_plans FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- subscriptions — own only + admin
-- --------------------------------------------------------------------------
CREATE POLICY subscriptions_select_own
    ON subscriptions FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR is_admin());

CREATE POLICY subscriptions_insert_own
    ON subscriptions FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY subscriptions_update_own
    ON subscriptions FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY subscriptions_admin
    ON subscriptions FOR ALL TO authenticated
    USING (is_admin());

CREATE POLICY subscriptions_service_role
    ON subscriptions FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- subscription_events — own only (via join) + admin
-- --------------------------------------------------------------------------
CREATE POLICY subscription_events_select_own
    ON subscription_events FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM subscriptions s
            WHERE s.id = subscription_events.subscription_id
              AND s.user_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY subscription_events_service_role
    ON subscription_events FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- subscription_payments — own only (via join) + admin
-- --------------------------------------------------------------------------
CREATE POLICY subscription_payments_select_own
    ON subscription_payments FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM subscriptions s
            WHERE s.id = subscription_payments.subscription_id
              AND s.user_id = (SELECT auth.uid())
        )
        OR is_admin()
    );

CREATE POLICY subscription_payments_service_role
    ON subscription_payments FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- referral_codes — public read (code lookup), own write
-- --------------------------------------------------------------------------
CREATE POLICY referral_codes_select_authenticated
    ON referral_codes FOR SELECT TO authenticated
    USING (true);

CREATE POLICY referral_codes_insert_own
    ON referral_codes FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY referral_codes_update_own
    ON referral_codes FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY referral_codes_admin
    ON referral_codes FOR ALL TO authenticated
    USING (is_admin());

-- --------------------------------------------------------------------------
-- referrals — own only (referrer or referred) + admin
-- --------------------------------------------------------------------------
CREATE POLICY referrals_select_own
    ON referrals FOR SELECT TO authenticated
    USING (
        referrer_id = (SELECT auth.uid())
        OR referred_id = (SELECT auth.uid())
        OR is_admin()
    );

CREATE POLICY referrals_insert_authenticated
    ON referrals FOR INSERT TO authenticated
    WITH CHECK (referred_id = (SELECT auth.uid()));

CREATE POLICY referrals_service_role
    ON referrals FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- user_memberships — own only + admin
-- --------------------------------------------------------------------------
CREATE POLICY user_memberships_select_own
    ON user_memberships FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()) OR is_admin());

CREATE POLICY user_memberships_insert_own
    ON user_memberships FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_memberships_update_own
    ON user_memberships FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_memberships_service_role
    ON user_memberships FOR ALL TO service_role
    USING (true);

-- --------------------------------------------------------------------------
-- End of 009_payments_and_subscriptions.sql
-- --------------------------------------------------------------------------
