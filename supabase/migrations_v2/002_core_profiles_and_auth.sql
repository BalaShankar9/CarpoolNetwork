-- ============================================================================
-- CarpoolNetwork Consolidated Migration v2
-- 002: Core Profiles, Auth, and User-Related Tables
-- ============================================================================
-- This migration creates the profiles table (single CREATE TABLE with all
-- columns), user_preferences, emergency_contacts, ai_chat_history,
-- saved_locations, plus all triggers, RLS policies, and indexes.
--
-- Depends on: 001_extensions_and_utils.sql (ENUMs, utility functions)
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. profiles
-- --------------------------------------------------------------------------

CREATE TABLE profiles (
    id                              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email                           text UNIQUE NOT NULL,
    full_name                       text NOT NULL,
    avatar_url                      text,
    phone                           text,
    phone_e164                      text,
    bio                             text,
    about_me                        text,
    date_of_birth                   date,
    gender                          gender_type,

    -- Location
    city                            text,
    country                         text,
    home_city                       text,
    current_browsing_city           text,
    location_mode                   text DEFAULT 'manual'
                                        CHECK (location_mode IN ('gps', 'manual')),

    -- Verification flags
    is_verified                     boolean DEFAULT false,
    email_verified                  boolean DEFAULT false,
    phone_verified                  boolean DEFAULT false,
    photo_verified                  boolean DEFAULT false,
    verification_badge              text,
    profile_photo_url               text,
    profile_verified                boolean DEFAULT false,
    profile_verification_date       timestamptz,
    profile_completion_percentage   integer DEFAULT 0,

    -- Ride statistics
    total_rides_offered             integer DEFAULT 0,
    total_rides_taken               integer DEFAULT 0,
    total_bookings                  integer DEFAULT 0,
    cancelled_bookings              integer DEFAULT 0,
    last_minute_cancellations       integer DEFAULT 0,

    -- Ratings & trust
    average_rating                  numeric(3,2) DEFAULT 0,
    trust_score                     numeric(5,2) DEFAULT 50.00,
    reliability_score               decimal(3,2) DEFAULT 5.00,

    -- Admin
    is_admin                        boolean DEFAULT false NOT NULL,

    -- WhatsApp & contact preferences
    whatsapp_number                 text,
    whatsapp_visibility             text DEFAULT 'match_only',
    whatsapp_opt_in                 boolean DEFAULT false,
    preferred_contact_method        text DEFAULT 'both'
                                        CHECK (preferred_contact_method IN ('in_app', 'whatsapp', 'both')),
    allow_inhouse_chat              boolean DEFAULT true,
    allow_whatsapp_chat             boolean DEFAULT true,

    -- Privacy
    privacy_phone_visibility        text DEFAULT 'MATCH_ONLY'
                                        CHECK (privacy_phone_visibility IN ('MATCH_ONLY', 'FRIENDS_ONLY', 'NEVER')),
    whatsapp_before_acceptance      boolean DEFAULT false,
    calls_allowed                   boolean DEFAULT false,

    -- Onboarding
    onboarding_completed            boolean DEFAULT false,
    onboarding_step                 integer DEFAULT 0,
    onboarding_skipped              boolean DEFAULT false,

    -- Leaderboard
    leaderboard_visible             boolean DEFAULT true,
    leaderboard_display_name        text,

    -- Profile personalisation
    profile_theme                   text DEFAULT 'default',
    interests_tags                  text[],
    languages_spoken                text[],
    travel_style                    text,
    fun_facts                       text[],

    -- Accessibility
    accessibility_high_contrast     boolean DEFAULT false,
    accessibility_font_size         text DEFAULT 'medium',
    accessibility_reduced_motion    boolean DEFAULT false,
    accessibility_color_blind_mode  text,
    accessibility_dyslexia_font     boolean DEFAULT false,
    accessibility_screen_reader     boolean DEFAULT false,

    -- Timestamps
    created_at                      timestamptz DEFAULT now(),
    updated_at                      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 2. user_preferences
-- --------------------------------------------------------------------------

CREATE TABLE user_preferences (
    user_id                     uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    music_preference            text CHECK (music_preference IN ('none', 'quiet', 'moderate', 'loud')),
    temperature_preference      text CHECK (temperature_preference IN ('cold', 'cool', 'moderate', 'warm')),
    conversation_level          text CHECK (conversation_level IN ('quiet', 'moderate', 'chatty')),
    smoking_policy              text DEFAULT 'no-smoking'
                                    CHECK (smoking_policy IN ('no-smoking', 'outside-only', 'allowed')),
    pets_allowed                boolean DEFAULT false,
    max_detour_minutes          integer DEFAULT 10,
    gender_preference           text DEFAULT 'any'
                                    CHECK (gender_preference IN ('any', 'same', 'male', 'female')),
    auto_accept_rides           boolean DEFAULT false,
    luggage_size                text,
    food_drink_allowed          boolean,
    child_seat_available        boolean,
    wheelchair_accessible       boolean,
    wifi_available              boolean,
    charging_available          boolean,
    min_passenger_rating        numeric,
    require_verified_passengers boolean DEFAULT false,
    instant_booking             boolean DEFAULT false,
    max_passengers              integer,
    preferred_routes            jsonb,
    created_at                  timestamptz DEFAULT now(),
    updated_at                  timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 3. emergency_contacts
-- --------------------------------------------------------------------------

CREATE TABLE emergency_contacts (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name                    text NOT NULL,
    phone                   text NOT NULL,
    relationship            text NOT NULL,
    is_primary              boolean DEFAULT false,
    share_location_enabled  boolean DEFAULT false,
    contact_name            text,
    contact_phone           text,
    contact_email           text,
    priority_order          integer DEFAULT 0,
    created_at              timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 4. ai_chat_history
-- --------------------------------------------------------------------------

CREATE TABLE ai_chat_history (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message         text NOT NULL,
    role            text NOT NULL CHECK (role IN ('user', 'assistant')),
    session_id      text,
    created_at      timestamptz DEFAULT now()
);

-- --------------------------------------------------------------------------
-- 5. saved_locations
-- --------------------------------------------------------------------------

CREATE TABLE saved_locations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name            text NOT NULL,
    address         text,
    latitude        numeric(10,8),
    longitude       numeric(11,8),
    created_at      timestamptz DEFAULT now(),
    UNIQUE (user_id, name)
);

-- --------------------------------------------------------------------------
-- 6. Indexes
-- --------------------------------------------------------------------------

-- profiles
CREATE INDEX idx_profiles_is_admin   ON profiles (is_admin) WHERE is_admin = true;
CREATE INDEX idx_profiles_email      ON profiles (email);
CREATE INDEX idx_profiles_whatsapp   ON profiles (whatsapp_number) WHERE whatsapp_number IS NOT NULL;

-- FK indexes on child tables
CREATE INDEX idx_user_preferences_user_id      ON user_preferences (user_id);
CREATE INDEX idx_emergency_contacts_user_id    ON emergency_contacts (user_id);
CREATE INDEX idx_ai_chat_history_user_id       ON ai_chat_history (user_id);
CREATE INDEX idx_ai_chat_history_session_id    ON ai_chat_history (session_id);
CREATE INDEX idx_saved_locations_user_id       ON saved_locations (user_id);

-- --------------------------------------------------------------------------
-- 7. Triggers
-- --------------------------------------------------------------------------

-- Auto-update updated_at on profiles
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Auto-update updated_at on user_preferences
CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------------------------------------
-- 8. handle_new_user — auto-create profile on auth.users INSERT
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name',
            split_part(NEW.email, '@', 1)
        )
    );
    RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- --------------------------------------------------------------------------
-- 9. Auto-initialize reliability score on profile creation
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION initialize_reliability_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Ensure new profiles always start with the default reliability score
    IF NEW.reliability_score IS NULL THEN
        NEW.reliability_score := 5.00;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_init_reliability
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION initialize_reliability_score();

-- --------------------------------------------------------------------------
-- 10. Admin initialisation function
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION initialize_admin_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE profiles
    SET is_admin = true,
        updated_at = now()
    WHERE email = 'balashankarbollineni4@gmail.com';
END;
$$;

-- Attempt to set the initial admin now (no-op if the user hasn't signed up yet).
SELECT initialize_admin_user();

-- --------------------------------------------------------------------------
-- 11. Enable Row Level Security
-- --------------------------------------------------------------------------

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_locations    ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------------
-- 12. RLS Policies
-- --------------------------------------------------------------------------
-- All policies use (SELECT auth.uid()) instead of auth.uid() directly so
-- the planner evaluates the sub-select once per statement, not per row.
-- --------------------------------------------------------------------------

-- ---- profiles ----

CREATE POLICY profiles_select_authenticated
    ON profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY profiles_insert_own
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_own
    ON profiles FOR UPDATE
    TO authenticated
    USING (id = (SELECT auth.uid()));

CREATE POLICY profiles_update_admin
    ON profiles FOR UPDATE
    TO authenticated
    USING (is_admin());

-- ---- user_preferences ----

CREATE POLICY user_preferences_select_own
    ON user_preferences FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_preferences_insert_own
    ON user_preferences FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY user_preferences_update_own
    ON user_preferences FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY user_preferences_delete_own
    ON user_preferences FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- ---- emergency_contacts ----

CREATE POLICY emergency_contacts_select_own
    ON emergency_contacts FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY emergency_contacts_insert_own
    ON emergency_contacts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY emergency_contacts_update_own
    ON emergency_contacts FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY emergency_contacts_delete_own
    ON emergency_contacts FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- ---- ai_chat_history ----

CREATE POLICY ai_chat_history_select_own
    ON ai_chat_history FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY ai_chat_history_insert_own
    ON ai_chat_history FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- ---- saved_locations ----

CREATE POLICY saved_locations_select_own
    ON saved_locations FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY saved_locations_insert_own
    ON saved_locations FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY saved_locations_update_own
    ON saved_locations FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY saved_locations_delete_own
    ON saved_locations FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- --------------------------------------------------------------------------
-- End of 002_core_profiles_and_auth.sql
-- --------------------------------------------------------------------------
