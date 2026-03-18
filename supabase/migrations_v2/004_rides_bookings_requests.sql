-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 004: Rides, Bookings, and Request System
-- ============================================================================
-- This migration creates the rides table, booking system, waitlist, stops,
-- ride requests, trip requests / offers, booking history audit trail,
-- all associated functions, triggers, views, indexes, and RLS policies.
--
-- Depends on:
--   001_extensions_and_utils.sql  (ENUMs: ride_status, booking_status;
--                                  utility fn: update_updated_at_column)
--   002_core_profiles_and_auth.sql (profiles table)
--   003_vehicles.sql               (vehicles table)
-- ============================================================================

-- ==========================================================================
-- 1. TABLES
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 1a. rides
-- --------------------------------------------------------------------------
CREATE TABLE rides (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    vehicle_id          uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,

    -- Origin
    origin              text NOT NULL,
    origin_lat          numeric(10,8) NOT NULL,
    origin_lng          numeric(11,8) NOT NULL,

    -- Destination
    destination         text NOT NULL,
    destination_lat     numeric(10,8) NOT NULL,
    destination_lng     numeric(11,8) NOT NULL,

    -- Schedule
    departure_time      timestamptz NOT NULL,

    -- Capacity
    available_seats     integer NOT NULL,
    total_seats         integer NOT NULL,

    -- Status (enum from 001)
    status              ride_status DEFAULT 'active',

    -- Recurrence
    is_recurring        boolean DEFAULT false,
    recurrence_pattern  jsonb,

    -- Route details
    notes               text,
    route_polyline      text,
    estimated_duration  integer,               -- minutes
    estimated_distance  numeric(10,2),          -- km

    -- Area / grouping helpers
    city_area           text,
    start_point         text,

    -- Pricing / pickup
    price_per_seat      numeric(10,2),
    pickup_radius_km    numeric(5,2) DEFAULT 5.0,

    -- Lifecycle
    closed_at           timestamptz,
    metadata            jsonb DEFAULT '{}'::jsonb,
    cancellation_reason text,

    -- Timestamps
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1b. ride_bookings
-- --------------------------------------------------------------------------
CREATE TABLE ride_bookings (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id                     uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    passenger_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Pickup
    pickup_location             text,
    pickup_lat                  numeric(10,8),
    pickup_lng                  numeric(11,8),

    -- Dropoff
    dropoff_location            text,
    dropoff_lat                 numeric(10,8),
    dropoff_lng                 numeric(11,8),

    seats_requested             integer DEFAULT 1,
    status                      booking_status DEFAULT 'pending',
    pickup_order                integer,

    -- Cancellation
    cancellation_reason         text,
    cancelled_at                timestamptz,
    is_last_minute_cancellation boolean DEFAULT false,

    -- Timestamps
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now(),

    CONSTRAINT uq_ride_booking_per_passenger UNIQUE (ride_id, passenger_id)
);

-- --------------------------------------------------------------------------
-- 1c. ride_waitlist
-- --------------------------------------------------------------------------
CREATE TABLE ride_waitlist (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id     uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    position    integer NOT NULL,
    created_at  timestamptz DEFAULT now(),

    CONSTRAINT uq_waitlist_per_user UNIQUE (ride_id, user_id)
);

-- --------------------------------------------------------------------------
-- 1d. ride_stops
-- --------------------------------------------------------------------------
CREATE TABLE ride_stops (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id     uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    stop_order  integer NOT NULL CHECK (stop_order >= 0),
    stop_type   text NOT NULL CHECK (stop_type IN ('driver_start', 'pickup', 'destination')),
    location    text NOT NULL,
    lat         numeric(10,8) NOT NULL,
    lng         numeric(11,8) NOT NULL,
    user_id     uuid REFERENCES profiles(id) ON DELETE SET NULL,
    created_at  timestamptz DEFAULT now(),

    CONSTRAINT uq_ride_stop_order UNIQUE (ride_id, stop_order)
);

-- --------------------------------------------------------------------------
-- 1e. ride_requests (rider requesting a seat from a specific ride/driver)
-- --------------------------------------------------------------------------
CREATE TABLE ride_requests (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id            uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ride_id                 uuid REFERENCES rides(id) ON DELETE CASCADE,

    -- Journey
    from_location           text,
    to_location             text,
    from_lat                numeric(10,8),
    from_lng                numeric(11,8),
    to_lat                  numeric(10,8),
    to_lng                  numeric(11,8),

    departure_time          timestamptz,
    flexible_time           boolean DEFAULT false,
    seats_needed            integer CHECK (seats_needed BETWEEN 1 AND 8),
    notes                   text,

    -- Status (broad set covering both request-to-driver and matching flows)
    status                  text DEFAULT 'pending'
                                CHECK (status IN (
                                    'pending', 'matched', 'cancelled', 'expired',
                                    'PENDING_DRIVER', 'ACCEPTED_BY_DRIVER',
                                    'DECLINED_BY_DRIVER', 'CANCELLED_BY_RIDER',
                                    'CONFIRMED'
                                )),

    -- Pickup (resolved after acceptance)
    pickup_location         text,
    pickup_lat              numeric(10,8),
    pickup_lng              numeric(11,8),

    -- Driver response
    responded_at            timestamptz,
    overlap_window_start    timestamptz,
    overlap_window_end      timestamptz,

    -- Contact unlock
    contact_unlocked_at     timestamptz,
    whatsapp_unlocked       boolean DEFAULT false,

    -- Matching-system variant columns
    rider_id                uuid REFERENCES profiles(id) ON DELETE CASCADE,
    seats_requested         integer DEFAULT 1,

    -- Timestamps
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1f. trip_requests (standalone: rider looking for any driver)
-- --------------------------------------------------------------------------
CREATE TABLE trip_requests (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id                uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    from_location           text NOT NULL,
    to_location             text NOT NULL,
    from_lat                numeric(10,8) NOT NULL,
    from_lng                numeric(11,8) NOT NULL,
    to_lat                  numeric(10,8) NOT NULL,
    to_lng                  numeric(11,8) NOT NULL,

    departure_time          timestamptz NOT NULL,
    flexible_window_minutes integer DEFAULT 60,
    seats_needed            integer NOT NULL,
    notes                   text,

    status                  text DEFAULT 'OPEN'
                                CHECK (status IN ('OPEN', 'CONFIRMED', 'CANCELLED', 'EXPIRED')),

    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1g. trip_offers (driver offering to fulfil a trip_request)
-- --------------------------------------------------------------------------
CREATE TABLE trip_offers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_request_id     uuid NOT NULL REFERENCES trip_requests(id) ON DELETE CASCADE,
    driver_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ride_id             uuid REFERENCES rides(id) ON DELETE SET NULL,

    message             text,
    estimated_price     numeric(10,2),

    status              text DEFAULT 'OFFERED'
                            CHECK (status IN (
                                'OFFERED', 'CONFIRMED', 'DECLINED_BY_RIDER',
                                'WITHDRAWN_BY_DRIVER', 'EXPIRED'
                            )),

    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 1h. booking_history (audit trail)
-- --------------------------------------------------------------------------
CREATE TABLE booking_history (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  uuid NOT NULL REFERENCES ride_bookings(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action      text NOT NULL,
    reason      text,
    created_at  timestamptz DEFAULT now()
);


-- ==========================================================================
-- 2. INDEXES
-- ==========================================================================

-- rides ---------------------------------------------------------------
CREATE INDEX idx_rides_driver_id       ON rides (driver_id);
CREATE INDEX idx_rides_vehicle_id      ON rides (vehicle_id);
CREATE INDEX idx_rides_status          ON rides (status);
CREATE INDEX idx_rides_departure_time  ON rides (departure_time);
CREATE INDEX idx_rides_origin_coords   ON rides (origin_lat, origin_lng);

-- ride_bookings -------------------------------------------------------
CREATE INDEX idx_ride_bookings_ride_id      ON ride_bookings (ride_id);
CREATE INDEX idx_ride_bookings_passenger_id ON ride_bookings (passenger_id);
CREATE INDEX idx_ride_bookings_status       ON ride_bookings (status);

-- Partial unique: only one active (non-cancelled) booking per passenger
CREATE UNIQUE INDEX idx_unique_active_booking_per_passenger
    ON ride_bookings (ride_id, passenger_id)
    WHERE status != 'cancelled';

-- ride_waitlist -------------------------------------------------------
CREATE INDEX idx_ride_waitlist_ride_id ON ride_waitlist (ride_id);
CREATE INDEX idx_ride_waitlist_user_id ON ride_waitlist (user_id);

-- ride_stops ----------------------------------------------------------
CREATE INDEX idx_ride_stops_ride_id ON ride_stops (ride_id);

-- ride_requests -------------------------------------------------------
CREATE INDEX idx_ride_requests_requester_id    ON ride_requests (requester_id);
CREATE INDEX idx_ride_requests_rider_id        ON ride_requests (rider_id);
CREATE INDEX idx_ride_requests_ride_id         ON ride_requests (ride_id);
CREATE INDEX idx_ride_requests_status          ON ride_requests (status);
CREATE INDEX idx_ride_requests_departure_time  ON ride_requests (departure_time);

-- trip_requests -------------------------------------------------------
CREATE INDEX idx_trip_requests_rider_id ON trip_requests (rider_id);
CREATE INDEX idx_trip_requests_status   ON trip_requests (status);

-- trip_offers ---------------------------------------------------------
CREATE INDEX idx_trip_offers_trip_request_id ON trip_offers (trip_request_id);
CREATE INDEX idx_trip_offers_driver_id       ON trip_offers (driver_id);
CREATE INDEX idx_trip_offers_ride_id         ON trip_offers (ride_id);

-- booking_history -----------------------------------------------------
CREATE INDEX idx_booking_history_booking_id ON booking_history (booking_id);
CREATE INDEX idx_booking_history_user_id    ON booking_history (user_id);


-- ==========================================================================
-- 3. VIEWS
-- ==========================================================================

-- Dynamically recalculates available seats from confirmed bookings so that
-- the rides.available_seats column can be treated as a cache / fallback.
CREATE OR REPLACE VIEW rides_with_calculated_seats AS
SELECT
    r.*,
    r.total_seats - COALESCE(
        (SELECT SUM(rb.seats_requested)
         FROM ride_bookings rb
         WHERE rb.ride_id = r.id
           AND rb.status IN ('pending', 'confirmed')),
        0
    ) AS calculated_available_seats
FROM rides r;


-- ==========================================================================
-- 4. FUNCTIONS
-- ==========================================================================

-- --------------------------------------------------------------------------
-- 4a. SECURITY DEFINER helper: does a user hold a booking for a ride?
--     Used inside RLS policies so that passengers can SELECT rides they
--     have booked without the policy itself needing to query ride_bookings
--     (which would trigger its own RLS and risk infinite recursion).
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION user_has_booking_for_ride(ride_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM ride_bookings
        WHERE ride_id = ride_uuid
          AND passenger_id = user_uuid
          AND status != 'cancelled'
    );
$$;

-- --------------------------------------------------------------------------
-- 4b. recalculate_ride_seats – sync available_seats from actual bookings
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recalculate_ride_seats(p_ride_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total   integer;
    v_booked  integer;
BEGIN
    SELECT total_seats INTO v_total
    FROM rides
    WHERE id = p_ride_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride % not found', p_ride_id;
    END IF;

    SELECT COALESCE(SUM(seats_requested), 0) INTO v_booked
    FROM ride_bookings
    WHERE ride_id = p_ride_id
      AND status IN ('pending', 'confirmed');

    UPDATE rides
    SET available_seats = v_total - v_booked,
        updated_at      = now()
    WHERE id = p_ride_id;
END;
$$;

-- --------------------------------------------------------------------------
-- 4c. auto_sync_ride_seats – trigger function on ride_bookings changes
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_sync_ride_seats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- On DELETE, OLD holds the row; on INSERT/UPDATE, NEW holds it.
    IF TG_OP = 'DELETE' THEN
        PERFORM recalculate_ride_seats(OLD.ride_id);
    ELSE
        PERFORM recalculate_ride_seats(NEW.ride_id);
        -- If ride_id changed (edge case) also recalculate the old ride.
        IF TG_OP = 'UPDATE' AND OLD.ride_id IS DISTINCT FROM NEW.ride_id THEN
            PERFORM recalculate_ride_seats(OLD.ride_id);
        END IF;
    END IF;
    RETURN NULL; -- AFTER trigger; return value ignored
END;
$$;

-- --------------------------------------------------------------------------
-- 4d. request_booking – atomic booking with row-level locking
--     Returns the new booking id.
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION request_booking(
    p_ride_id          uuid,
    p_pickup_location  text,
    p_pickup_lat       numeric,
    p_pickup_lng       numeric,
    p_dropoff_location text,
    p_dropoff_lat      numeric,
    p_dropoff_lng      numeric,
    p_seats_requested  integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_available  integer;
    v_booking_id uuid;
    v_caller     uuid := (SELECT auth.uid());
BEGIN
    IF v_caller IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Lock the ride row to prevent concurrent overbooking
    SELECT available_seats INTO v_available
    FROM rides
    WHERE id = p_ride_id
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found or not active';
    END IF;

    IF v_available < p_seats_requested THEN
        RAISE EXCEPTION 'Not enough seats available (requested %, available %)',
            p_seats_requested, v_available;
    END IF;

    -- Prevent duplicate active bookings (belt-and-suspenders; partial index also guards)
    IF EXISTS (
        SELECT 1 FROM ride_bookings
        WHERE ride_id = p_ride_id
          AND passenger_id = v_caller
          AND status != 'cancelled'
    ) THEN
        RAISE EXCEPTION 'You already have an active booking for this ride';
    END IF;

    INSERT INTO ride_bookings (
        ride_id, passenger_id,
        pickup_location, pickup_lat, pickup_lng,
        dropoff_location, dropoff_lat, dropoff_lng,
        seats_requested, status
    ) VALUES (
        p_ride_id, v_caller,
        p_pickup_location, p_pickup_lat, p_pickup_lng,
        p_dropoff_location, p_dropoff_lat, p_dropoff_lng,
        p_seats_requested, 'pending'
    )
    RETURNING id INTO v_booking_id;

    -- Seat count is auto-synced via the trigger, but we also do it inline
    -- for immediate consistency within this transaction.
    UPDATE rides
    SET available_seats = available_seats - p_seats_requested,
        updated_at      = now()
    WHERE id = p_ride_id;

    -- Audit trail
    INSERT INTO booking_history (booking_id, user_id, action)
    VALUES (v_booking_id, v_caller, 'requested');

    RETURN v_booking_id;
END;
$$;

-- --------------------------------------------------------------------------
-- 4e. accept_ride_request – driver accepts a ride_request, creates booking
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_ride_request(
    p_request_id      uuid,
    p_accepting_driver uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req           ride_requests%ROWTYPE;
    v_available     integer;
    v_booking_id    uuid;
BEGIN
    SELECT * INTO v_req
    FROM ride_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride request not found';
    END IF;

    IF v_req.status NOT IN ('pending', 'PENDING_DRIVER') THEN
        RAISE EXCEPTION 'Request is no longer pending (status: %)', v_req.status;
    END IF;

    -- Verify the accepting user is the driver of the associated ride
    IF v_req.ride_id IS NOT NULL THEN
        PERFORM 1 FROM rides
        WHERE id = v_req.ride_id AND driver_id = p_accepting_driver;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'You are not the driver of this ride';
        END IF;

        -- Check seat availability
        SELECT available_seats INTO v_available
        FROM rides
        WHERE id = v_req.ride_id
        FOR UPDATE;

        IF v_available < COALESCE(v_req.seats_needed, v_req.seats_requested, 1) THEN
            RAISE EXCEPTION 'Not enough seats available';
        END IF;

        -- Create a booking for the requester
        INSERT INTO ride_bookings (
            ride_id, passenger_id,
            pickup_location, pickup_lat, pickup_lng,
            seats_requested, status
        ) VALUES (
            v_req.ride_id,
            COALESCE(v_req.rider_id, v_req.requester_id),
            v_req.pickup_location, v_req.pickup_lat, v_req.pickup_lng,
            COALESCE(v_req.seats_needed, v_req.seats_requested, 1),
            'confirmed'
        )
        RETURNING id INTO v_booking_id;
    END IF;

    -- Update the request status
    UPDATE ride_requests
    SET status       = 'ACCEPTED_BY_DRIVER',
        responded_at = now(),
        updated_at   = now()
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'request_id', p_request_id,
        'booking_id', v_booking_id,
        'status',     'ACCEPTED_BY_DRIVER'
    );
END;
$$;

-- --------------------------------------------------------------------------
-- 4f. driver_decline_ride_request
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION driver_decline_ride_request(
    p_request_id       uuid,
    p_declining_driver uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req ride_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_req
    FROM ride_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride request not found';
    END IF;

    IF v_req.status NOT IN ('pending', 'PENDING_DRIVER') THEN
        RAISE EXCEPTION 'Request is no longer pending (status: %)', v_req.status;
    END IF;

    -- Verify driver ownership
    IF v_req.ride_id IS NOT NULL THEN
        PERFORM 1 FROM rides
        WHERE id = v_req.ride_id AND driver_id = p_declining_driver;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'You are not the driver of this ride';
        END IF;
    END IF;

    UPDATE ride_requests
    SET status       = 'DECLINED_BY_DRIVER',
        responded_at = now(),
        updated_at   = now()
    WHERE id = p_request_id;
END;
$$;

-- --------------------------------------------------------------------------
-- 4g. confirm_ride_request – rider confirms after driver acceptance
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_ride_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller uuid := (SELECT auth.uid());
    v_req    ride_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_req
    FROM ride_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride request not found';
    END IF;

    IF v_req.status != 'ACCEPTED_BY_DRIVER' THEN
        RAISE EXCEPTION 'Request has not been accepted by driver (status: %)', v_req.status;
    END IF;

    IF COALESCE(v_req.rider_id, v_req.requester_id) != v_caller THEN
        RAISE EXCEPTION 'You are not the requester of this ride request';
    END IF;

    UPDATE ride_requests
    SET status     = 'CONFIRMED',
        updated_at = now()
    WHERE id = p_request_id;
END;
$$;

-- --------------------------------------------------------------------------
-- 4h. confirm_trip_offer – rider confirms a trip offer from a driver
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_trip_offer(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller uuid := (SELECT auth.uid());
    v_offer  trip_offers%ROWTYPE;
    v_req    trip_requests%ROWTYPE;
BEGIN
    SELECT * INTO v_offer
    FROM trip_offers
    WHERE id = p_offer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Trip offer not found';
    END IF;

    IF v_offer.status != 'OFFERED' THEN
        RAISE EXCEPTION 'Offer is no longer available (status: %)', v_offer.status;
    END IF;

    -- Only the trip requester (rider) can confirm
    SELECT * INTO v_req
    FROM trip_requests
    WHERE id = v_offer.trip_request_id;

    IF v_req.rider_id != v_caller THEN
        RAISE EXCEPTION 'You are not the requester of this trip';
    END IF;

    -- Confirm the offer
    UPDATE trip_offers
    SET status     = 'CONFIRMED',
        updated_at = now()
    WHERE id = p_offer_id;

    -- Mark the trip request as confirmed
    UPDATE trip_requests
    SET status     = 'CONFIRMED',
        updated_at = now()
    WHERE id = v_offer.trip_request_id;

    -- Decline all other pending offers for this trip
    UPDATE trip_offers
    SET status     = 'DECLINED_BY_RIDER',
        updated_at = now()
    WHERE trip_request_id = v_offer.trip_request_id
      AND id != p_offer_id
      AND status = 'OFFERED';
END;
$$;


-- ==========================================================================
-- 5. PERMISSION GRANTS (atomic functions)
-- ==========================================================================

REVOKE ALL ON FUNCTION request_booking          FROM PUBLIC;
REVOKE ALL ON FUNCTION accept_ride_request      FROM PUBLIC;
REVOKE ALL ON FUNCTION driver_decline_ride_request FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_ride_request     FROM PUBLIC;
REVOKE ALL ON FUNCTION confirm_trip_offer       FROM PUBLIC;
REVOKE ALL ON FUNCTION recalculate_ride_seats   FROM PUBLIC;

GRANT EXECUTE ON FUNCTION request_booking          TO authenticated;
GRANT EXECUTE ON FUNCTION accept_ride_request      TO authenticated;
GRANT EXECUTE ON FUNCTION driver_decline_ride_request TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_ride_request     TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_trip_offer       TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_ride_seats   TO authenticated;


-- ==========================================================================
-- 6. TRIGGERS
-- ==========================================================================

-- updated_at auto-touch ------------------------------------------------
CREATE TRIGGER trg_rides_updated_at
    BEFORE UPDATE ON rides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ride_bookings_updated_at
    BEFORE UPDATE ON ride_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ride_requests_updated_at
    BEFORE UPDATE ON ride_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_trip_requests_updated_at
    BEFORE UPDATE ON trip_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_trip_offers_updated_at
    BEFORE UPDATE ON trip_offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-sync available_seats when bookings change -----------------------
CREATE TRIGGER trg_auto_sync_ride_seats
    AFTER INSERT OR UPDATE OR DELETE ON ride_bookings
    FOR EACH ROW EXECUTE FUNCTION auto_sync_ride_seats();

-- Log ride creation to activity_logs (if the table exists) -------------
CREATE OR REPLACE FUNCTION log_ride_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only log if the activity_logs table exists (created in a later migration)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'activity_logs'
    ) THEN
        INSERT INTO activity_logs (user_id, action, entity_type, entity_id, metadata)
        VALUES (
            NEW.driver_id,
            'ride_created',
            'ride',
            NEW.id,
            jsonb_build_object(
                'origin',      NEW.origin,
                'destination', NEW.destination,
                'departure',   NEW.departure_time,
                'seats',       NEW.total_seats
            )
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_ride_creation
    AFTER INSERT ON rides
    FOR EACH ROW EXECUTE FUNCTION log_ride_creation();


-- ==========================================================================
-- 7. ROW LEVEL SECURITY
-- ==========================================================================

-- Enable RLS on all tables --------------------------------------------
ALTER TABLE rides           ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_bookings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_waitlist   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_stops      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_offers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_history ENABLE ROW LEVEL SECURITY;

-- ===================== rides ==========================================

-- SELECT: active rides, own rides, or rides the user has booked
CREATE POLICY rides_select ON rides FOR SELECT TO authenticated
    USING (
        status = 'active'
        OR driver_id = (SELECT auth.uid())
        OR user_has_booking_for_ride(id, (SELECT auth.uid()))
    );

-- INSERT: only as the driver
CREATE POLICY rides_insert ON rides FOR INSERT TO authenticated
    WITH CHECK (
        driver_id = (SELECT auth.uid())
    );

-- UPDATE: only the driver of the ride
CREATE POLICY rides_update ON rides FOR UPDATE TO authenticated
    USING (driver_id = (SELECT auth.uid()))
    WITH CHECK (driver_id = (SELECT auth.uid()));

-- DELETE: only the driver
CREATE POLICY rides_delete ON rides FOR DELETE TO authenticated
    USING (driver_id = (SELECT auth.uid()));

-- ===================== ride_bookings ==================================

-- SELECT: own bookings or bookings for rides you drive
CREATE POLICY ride_bookings_select ON ride_bookings FOR SELECT TO authenticated
    USING (
        passenger_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_bookings.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

-- INSERT: only as the passenger (yourself)
CREATE POLICY ride_bookings_insert ON ride_bookings FOR INSERT TO authenticated
    WITH CHECK (
        passenger_id = (SELECT auth.uid())
    );

-- UPDATE: passenger can update own bookings; driver can update bookings on their rides
CREATE POLICY ride_bookings_update ON ride_bookings FOR UPDATE TO authenticated
    USING (
        passenger_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_bookings.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        passenger_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_bookings.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

-- ===================== ride_waitlist ==================================

-- SELECT: user is on the waitlist or is the ride driver
CREATE POLICY ride_waitlist_select ON ride_waitlist FOR SELECT TO authenticated
    USING (
        user_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_waitlist.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

-- INSERT: only yourself
CREATE POLICY ride_waitlist_insert ON ride_waitlist FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- DELETE: only yourself
CREATE POLICY ride_waitlist_delete ON ride_waitlist FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- ===================== ride_stops =====================================

-- SELECT: stops for rides the user is involved in (driver or has booking)
CREATE POLICY ride_stops_select ON ride_stops FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_stops.ride_id
              AND (
                  rides.driver_id = (SELECT auth.uid())
                  OR user_has_booking_for_ride(rides.id, (SELECT auth.uid()))
              )
        )
    );

-- INSERT/UPDATE/DELETE: only the ride driver
CREATE POLICY ride_stops_insert ON ride_stops FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_stops.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

CREATE POLICY ride_stops_update ON ride_stops FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_stops.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_stops.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

CREATE POLICY ride_stops_delete ON ride_stops FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_stops.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

-- ===================== ride_requests ==================================

-- SELECT: pending requests visible to all; own requests; requests on rides you drive
CREATE POLICY ride_requests_select ON ride_requests FOR SELECT TO authenticated
    USING (
        status IN ('pending', 'PENDING_DRIVER')
        OR requester_id = (SELECT auth.uid())
        OR rider_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_requests.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

-- INSERT: only as the requester
CREATE POLICY ride_requests_insert ON ride_requests FOR INSERT TO authenticated
    WITH CHECK (
        requester_id = (SELECT auth.uid())
    );

-- UPDATE: requester or driver of the associated ride
CREATE POLICY ride_requests_update ON ride_requests FOR UPDATE TO authenticated
    USING (
        requester_id = (SELECT auth.uid())
        OR rider_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_requests.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        requester_id = (SELECT auth.uid())
        OR rider_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM rides
            WHERE rides.id = ride_requests.ride_id
              AND rides.driver_id = (SELECT auth.uid())
        )
    );

-- ===================== trip_requests ==================================

-- SELECT: open requests visible to all; own requests always visible
CREATE POLICY trip_requests_select ON trip_requests FOR SELECT TO authenticated
    USING (
        status = 'OPEN'
        OR rider_id = (SELECT auth.uid())
    );

-- INSERT: only as the rider
CREATE POLICY trip_requests_insert ON trip_requests FOR INSERT TO authenticated
    WITH CHECK (rider_id = (SELECT auth.uid()));

-- UPDATE: only own requests
CREATE POLICY trip_requests_update ON trip_requests FOR UPDATE TO authenticated
    USING (rider_id = (SELECT auth.uid()))
    WITH CHECK (rider_id = (SELECT auth.uid()));

-- DELETE: only own requests
CREATE POLICY trip_requests_delete ON trip_requests FOR DELETE TO authenticated
    USING (rider_id = (SELECT auth.uid()));

-- ===================== trip_offers ====================================

-- SELECT: driver who made the offer or rider who owns the trip request
CREATE POLICY trip_offers_select ON trip_offers FOR SELECT TO authenticated
    USING (
        driver_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM trip_requests
            WHERE trip_requests.id = trip_offers.trip_request_id
              AND trip_requests.rider_id = (SELECT auth.uid())
        )
    );

-- INSERT: only as the driver
CREATE POLICY trip_offers_insert ON trip_offers FOR INSERT TO authenticated
    WITH CHECK (driver_id = (SELECT auth.uid()));

-- UPDATE: driver can withdraw; rider can confirm/decline (via their trip_request ownership)
CREATE POLICY trip_offers_update ON trip_offers FOR UPDATE TO authenticated
    USING (
        driver_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM trip_requests
            WHERE trip_requests.id = trip_offers.trip_request_id
              AND trip_requests.rider_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        driver_id = (SELECT auth.uid())
        OR EXISTS (
            SELECT 1 FROM trip_requests
            WHERE trip_requests.id = trip_offers.trip_request_id
              AND trip_requests.rider_id = (SELECT auth.uid())
        )
    );

-- ===================== booking_history ================================

-- SELECT: own history entries
CREATE POLICY booking_history_select ON booking_history FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- INSERT: only own entries
CREATE POLICY booking_history_insert ON booking_history FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));


-- ==========================================================================
-- End of 004_rides_bookings_requests.sql
-- ==========================================================================
