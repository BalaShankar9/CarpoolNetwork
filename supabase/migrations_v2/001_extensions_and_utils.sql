-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 001: Extensions, ENUM Types, and Utility Functions
-- ============================================================================
-- This is the first migration in the v2 consolidated schema rebuild.
-- It establishes foundational extensions, custom ENUM types (replacing
-- ad-hoc text CHECK constraints), and shared utility functions used
-- throughout the schema.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Extensions
-- --------------------------------------------------------------------------

-- PostGIS: geospatial queries (distance calculations, bounding boxes, etc.)
CREATE EXTENSION IF NOT EXISTS postgis;

-- pg_trgm: trigram-based text search for fuzzy matching (NEW improvement)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- pgcrypto: cryptographic functions (gen_random_uuid, etc.)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------------
-- 2. Custom ENUM Types
-- --------------------------------------------------------------------------
-- Using proper PostgreSQL ENUMs instead of text columns with CHECK
-- constraints. This provides type safety, better storage efficiency,
-- and clearer schema documentation.
--
-- Each type is wrapped in a DO block so the migration is re-runnable.
-- --------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE gender_type AS ENUM (
        'male', 'female', 'non-binary', 'prefer-not-to-say'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE ride_status AS ENUM (
        'active', 'in-progress', 'completed', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'pending', 'confirmed', 'completed', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE conversation_type AS ENUM (
        'RIDE_MATCH', 'TRIP_MATCH', 'FRIENDS_DM'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_type AS ENUM (
        'TEXT', 'SYSTEM', 'IMAGE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE safety_severity AS ENUM (
        'low', 'medium', 'high', 'critical'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE safety_report_status AS ENUM (
        'pending', 'investigating', 'resolved', 'dismissed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_severity AS ENUM (
        'critical', 'high', 'medium', 'low'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'new', 'triaging', 'fixing', 'pr_created', 'needs_review', 'deployed', 'dismissed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE match_status AS ENUM (
        'pending', 'accepted', 'declined', 'expired'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_priority AS ENUM (
        'low', 'normal', 'high', 'urgent'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_delivery_status AS ENUM (
        'pending', 'sent', 'failed'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE friend_request_status AS ENUM (
        'PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'active', 'cancelled', 'past_due', 'trialing'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE verification_method AS ENUM (
        'manual', 'dvla_api', 'document_upload'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- --------------------------------------------------------------------------
-- 3. Utility Functions
-- --------------------------------------------------------------------------

-- Generic trigger function: automatically sets updated_at to now()
-- Attach to any table via:
--   CREATE TRIGGER ... BEFORE UPDATE ON <table>
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Check whether the current authenticated user is an admin.
-- Uses (SELECT auth.uid()) sub-select pattern so the planner can
-- cache the value across row evaluations in RLS policies.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = (SELECT auth.uid())
          AND is_admin = true
    );
END;
$$;

-- Grant or revoke admin status for a target user.
-- Only callable by an existing admin.
CREATE OR REPLACE FUNCTION set_admin(target_user_id uuid, admin_status boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify the caller is already an admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Only admins can modify admin status';
    END IF;

    UPDATE profiles
    SET is_admin = admin_status,
        updated_at = now()
    WHERE id = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found', target_user_id;
    END IF;
END;
$$;

-- Haversine distance between two lat/lng pairs, returned in kilometres.
-- Useful for ride matching when PostGIS geography operations are overkill.
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 double precision,
    lng1 double precision,
    lat2 double precision,
    lng2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    earth_radius_km CONSTANT double precision := 6371.0;
    d_lat double precision;
    d_lng double precision;
    a double precision;
    c double precision;
BEGIN
    -- Convert degrees to radians
    d_lat := radians(lat2 - lat1);
    d_lng := radians(lng2 - lng1);

    a := sin(d_lat / 2.0) ^ 2
       + cos(radians(lat1)) * cos(radians(lat2))
       * sin(d_lng / 2.0) ^ 2;

    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

    RETURN earth_radius_km * c;
END;
$$;

-- --------------------------------------------------------------------------
-- End of 001_extensions_and_utils.sql
-- --------------------------------------------------------------------------
