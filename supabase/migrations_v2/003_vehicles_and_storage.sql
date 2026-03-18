-- 003_vehicles_and_storage.sql
-- Vehicles, driver licenses, vehicle insurance, storage buckets
-- Depends on: 001_extensions_and_utils (verification_method enum, updated_at trigger fn)

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    make                    text NOT NULL,
    model                   text NOT NULL,
    year                    integer NOT NULL,
    color                   text NOT NULL,
    license_plate           text NOT NULL,
    capacity                integer NOT NULL CHECK (capacity > 0 AND capacity <= 8),
    is_active               boolean DEFAULT true,
    fuel_type               text CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg')),
    vehicle_type            text CHECK (vehicle_type IN ('sedan', 'suv', 'hatchback', 'mpv', 'van', 'other')),
    registration_year       integer,
    engine_capacity         integer,
    image_url               text,
    vehicle_photo_url       text,
    plate_verified          boolean DEFAULT false,
    plate_verification_date timestamptz,
    extracted_plate_text    text,
    mot_status              text,
    mot_expiry_date         date,
    tax_status              text,
    tax_due_date            date,
    created_at              timestamptz DEFAULT now(),
    updated_at              timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicle_insurance (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id          uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    policy_number       text,
    provider            text,
    coverage_type       text CHECK (coverage_type IN ('third_party', 'third_party_fire_theft', 'comprehensive')),
    start_date          date,
    expiry_date         date,
    verified            boolean DEFAULT false,
    verified_at         timestamptz,
    covers_ridesharing  boolean DEFAULT false,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE (vehicle_id)
);

CREATE TABLE IF NOT EXISTS driver_licenses (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    license_type                text CHECK (license_type IN ('uk_full', 'uk_provisional', 'international')),
    license_number              text,
    country_of_issue            text,
    issue_date                  date,
    expiry_date                 date,
    verified                    boolean DEFAULT false,
    verified_at                 timestamptz,
    verification_method         verification_method,
    is_banned                   boolean DEFAULT false,
    ban_check_date              timestamptz,
    points                      integer DEFAULT 0 CHECK (points >= 0 AND points <= 12),
    categories                  text[],
    restrictions                text,
    international_arrival_date  date,
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now(),
    UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS license_verification_attempts (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id      uuid NOT NULL REFERENCES driver_licenses(id) ON DELETE CASCADE,
    attempt_type    text,
    status          text,
    error_message   text,
    verified_data   jsonb,
    created_at      timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_user_id
    ON vehicles (user_id);

CREATE INDEX IF NOT EXISTS idx_vehicles_is_active
    ON vehicles (is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_driver_licenses_user_id
    ON driver_licenses (user_id);

CREATE INDEX IF NOT EXISTS idx_driver_licenses_verified
    ON driver_licenses (verified) WHERE verified = true;

CREATE INDEX IF NOT EXISTS idx_driver_licenses_expiry_date
    ON driver_licenses (expiry_date);

CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_vehicle_id
    ON vehicle_insurance (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_vehicle_insurance_expiry_date
    ON vehicle_insurance (expiry_date);

-- ============================================================
-- TRIGGERS (updated_at)
-- ============================================================

CREATE TRIGGER set_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_vehicle_insurance_updated_at
    BEFORE UPDATE ON vehicle_insurance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_driver_licenses_updated_at
    BEFORE UPDATE ON driver_licenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SECURITY DEFINER HELPER (prevents RLS recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION user_has_booking_for_vehicle(vehicle_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM rides r
        JOIN ride_bookings rb ON rb.ride_id = r.id
        WHERE r.vehicle_id = vehicle_uuid
          AND rb.passenger_id = user_uuid
    );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- ---------- vehicles ----------

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_select ON vehicles
    FOR SELECT USING (
        user_id = (SELECT auth.uid())
        OR id IN (
            SELECT r.vehicle_id FROM rides r WHERE r.status = 'active'
        )
        OR user_has_booking_for_vehicle(id, (SELECT auth.uid()))
    );

CREATE POLICY vehicles_insert ON vehicles
    FOR INSERT WITH CHECK (
        user_id = (SELECT auth.uid())
    );

CREATE POLICY vehicles_update ON vehicles
    FOR UPDATE USING (
        user_id = (SELECT auth.uid())
    ) WITH CHECK (
        user_id = (SELECT auth.uid())
    );

CREATE POLICY vehicles_delete ON vehicles
    FOR DELETE USING (
        user_id = (SELECT auth.uid())
    );

-- ---------- driver_licenses ----------

ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY driver_licenses_select ON driver_licenses
    FOR SELECT USING (
        user_id = (SELECT auth.uid())
    );

CREATE POLICY driver_licenses_insert ON driver_licenses
    FOR INSERT WITH CHECK (
        user_id = (SELECT auth.uid())
    );

CREATE POLICY driver_licenses_update ON driver_licenses
    FOR UPDATE USING (
        user_id = (SELECT auth.uid())
    ) WITH CHECK (
        user_id = (SELECT auth.uid())
    );

-- ---------- vehicle_insurance ----------

ALTER TABLE vehicle_insurance ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_insurance_select ON vehicle_insurance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM vehicles v
            WHERE v.id = vehicle_insurance.vehicle_id
              AND v.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY vehicle_insurance_insert ON vehicle_insurance
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM vehicles v
            WHERE v.id = vehicle_insurance.vehicle_id
              AND v.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY vehicle_insurance_update ON vehicle_insurance
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM vehicles v
            WHERE v.id = vehicle_insurance.vehicle_id
              AND v.user_id = (SELECT auth.uid())
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM vehicles v
            WHERE v.id = vehicle_insurance.vehicle_id
              AND v.user_id = (SELECT auth.uid())
        )
    );

-- ---------- license_verification_attempts ----------

ALTER TABLE license_verification_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY license_verification_attempts_select ON license_verification_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM driver_licenses dl
            WHERE dl.id = license_verification_attempts.license_id
              AND dl.user_id = (SELECT auth.uid())
        )
    );

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('user-media', 'user-media', true, 10485760,  -- 10 MB
     ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    ('vehicle-images', 'vehicle-images', true, 5242880,  -- 5 MB
     ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE RLS POLICIES
-- ============================================================

-- ---------- user-media ----------

CREATE POLICY user_media_upload ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-media'
        AND (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    );

CREATE POLICY user_media_public_read ON storage.objects
    FOR SELECT USING (
        bucket_id = 'user-media'
    );

CREATE POLICY user_media_update ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-media'
        AND (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    );

CREATE POLICY user_media_delete ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-media'
        AND (storage.foldername(name))[1] = 'users'
        AND (storage.foldername(name))[2] = (SELECT auth.uid())::text
    );

-- ---------- vehicle-images ----------

CREATE POLICY vehicle_images_upload ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'vehicle-images'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY vehicle_images_public_read ON storage.objects
    FOR SELECT USING (
        bucket_id = 'vehicle-images'
    );

CREATE POLICY vehicle_images_update ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'vehicle-images'
        AND auth.role() = 'authenticated'
    );

CREATE POLICY vehicle_images_delete ON storage.objects
    FOR DELETE USING (
        bucket_id = 'vehicle-images'
        AND auth.role() = 'authenticated'
    );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Verify a user's profile photo (sets avatar_url on profiles)
CREATE OR REPLACE FUNCTION verify_profile_photo(p_user_id uuid, p_photo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE profiles
    SET avatar_url = p_photo_url,
        updated_at = now()
    WHERE id = p_user_id;
END;
$$;

-- Verify a vehicle's license plate via photo
CREATE OR REPLACE FUNCTION verify_vehicle_plate(
    p_vehicle_id uuid,
    p_photo_url text,
    p_extracted_text text,
    p_verified boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id uuid;
BEGIN
    SELECT user_id INTO v_owner_id FROM vehicles WHERE id = p_vehicle_id;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Vehicle not found';
    END IF;

    IF v_owner_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;

    UPDATE vehicles
    SET vehicle_photo_url       = p_photo_url,
        extracted_plate_text    = p_extracted_text,
        plate_verified          = p_verified,
        plate_verification_date = CASE WHEN p_verified THEN now() ELSE NULL END,
        updated_at              = now()
    WHERE id = p_vehicle_id;
END;
$$;

-- Check whether a user is eligible to drive
CREATE OR REPLACE FUNCTION can_user_drive(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_license driver_licenses%ROWTYPE;
BEGIN
    SELECT * INTO v_license
    FROM driver_licenses
    WHERE user_id = p_user_id
    LIMIT 1;

    -- No license on file
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- License not verified
    IF v_license.verified IS NOT TRUE THEN
        RETURN false;
    END IF;

    -- License expired
    IF v_license.expiry_date IS NOT NULL AND v_license.expiry_date < CURRENT_DATE THEN
        RETURN false;
    END IF;

    -- Driver is banned
    IF v_license.is_banned THEN
        RETURN false;
    END IF;

    -- International license past 12-month window
    IF v_license.license_type = 'international' THEN
        IF NOT is_international_license_valid(v_license.id) THEN
            RETURN false;
        END IF;
    END IF;

    RETURN true;
END;
$$;

-- Check whether an international license is still within its 12-month validity window
CREATE OR REPLACE FUNCTION is_international_license_valid(p_license_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_arrival_date date;
    v_license_type text;
BEGIN
    SELECT license_type, international_arrival_date
    INTO v_license_type, v_arrival_date
    FROM driver_licenses
    WHERE id = p_license_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Only applies to international licenses
    IF v_license_type != 'international' THEN
        RETURN true;
    END IF;

    -- No arrival date recorded — cannot validate
    IF v_arrival_date IS NULL THEN
        RETURN false;
    END IF;

    -- Valid for 12 months from arrival date
    RETURN CURRENT_DATE < (v_arrival_date + INTERVAL '12 months');
END;
$$;
