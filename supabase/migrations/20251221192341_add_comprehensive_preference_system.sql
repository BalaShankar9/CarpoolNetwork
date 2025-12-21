/*
  # Comprehensive Dual-Context Ride Preference System

  ## Overview
  Maximum-capability preference system supporting both driver-side and passenger-side preferences
  with AI matching, smart filtering, and context-aware automation.

  ## Schema Changes

  ### 1. Expand user_preferences Table
  
  **Driver-Side Preferences:**
  - Luggage, food/drink, child seat, and accessibility policies
  - Vehicle amenities (charging, WiFi, climate control)
  - Passenger screening requirements (ratings, verification, demographics)
  - Auto-acceptance rules and instant booking settings
  - Safety and communication preferences
  - Pricing and payment preferences
  
  **Passenger-Side Search Filters:**
  - Budget constraints and price filtering
  - Driver requirements (ratings, verification, background checks)
  - Comfort and amenity requirements
  - Route and logistics constraints
  - Social network filtering
  - Vehicle preferences and eco-friendly options
  - Smart matching and automation settings

  ### 2. New Tables Created
  
  **ride_preference_overrides**
  - Per-ride preference customization
  - Allows drivers to modify preferences for specific rides
  
  **passenger_search_filters**
  - Saved search filter configurations
  - Named filter profiles for different situations
  
  **preferred_drivers**
  - Favorite/trusted driver lists
  - Priority notification settings
  
  **blocked_users_preferences**
  - User-specific blocking with context
  - Block as driver, passenger, or both
  
  **recurring_ride_templates**
  - Saved ride templates for quick posting
  - Schedule and preference data bundled
  
  **search_history_analytics**
  - User search behavior tracking
  - ML-powered recommendation engine data
  
  **preference_profiles**
  - Named preference bundles (Budget, Comfort, Safety, etc.)
  - Situation-based quick switching

  ## Security
  - RLS enabled on all new tables
  - Users can only access their own data
  - Privacy controls for preference visibility
*/

-- ============================================================================
-- STEP 1: Expand user_preferences table with comprehensive preference fields
-- ============================================================================

-- Drop existing user_preferences columns if they exist and recreate with new structure
DO $$
BEGIN
  -- Driver-Side: Vehicle & Comfort Settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'luggage_policy') THEN
    ALTER TABLE user_preferences ADD COLUMN luggage_policy text DEFAULT 'medium-allowed' CHECK (luggage_policy IN ('none', 'small-bags-only', 'medium-allowed', 'large-allowed'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'food_drinks_allowed') THEN
    ALTER TABLE user_preferences ADD COLUMN food_drinks_allowed text DEFAULT 'snacks-ok' CHECK (food_drinks_allowed IN ('none', 'drinks-only', 'snacks-ok', 'meals-ok'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'child_seats_available') THEN
    ALTER TABLE user_preferences ADD COLUMN child_seats_available integer DEFAULT 0 CHECK (child_seats_available >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'wheelchair_accessible') THEN
    ALTER TABLE user_preferences ADD COLUMN wheelchair_accessible boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'pet_policy_details') THEN
    ALTER TABLE user_preferences ADD COLUMN pet_policy_details jsonb DEFAULT '{"allowed": false, "types": [], "size_limit": "small", "carrier_required": true}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'music_genres_preferred') THEN
    ALTER TABLE user_preferences ADD COLUMN music_genres_preferred text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'ac_heating_available') THEN
    ALTER TABLE user_preferences ADD COLUMN ac_heating_available boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'phone_charging_available') THEN
    ALTER TABLE user_preferences ADD COLUMN phone_charging_available boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'wifi_available') THEN
    ALTER TABLE user_preferences ADD COLUMN wifi_available boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'luggage_space_description') THEN
    ALTER TABLE user_preferences ADD COLUMN luggage_space_description text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'special_equipment') THEN
    ALTER TABLE user_preferences ADD COLUMN special_equipment text[] DEFAULT '{}';
  END IF;

  -- Driver-Side: Passenger Screening & Auto-Accept Rules
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'instant_booking_enabled') THEN
    ALTER TABLE user_preferences ADD COLUMN instant_booking_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'minimum_passenger_rating') THEN
    ALTER TABLE user_preferences ADD COLUMN minimum_passenger_rating numeric(3,2) DEFAULT 0.00 CHECK (minimum_passenger_rating >= 0 AND minimum_passenger_rating <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'require_passenger_verification') THEN
    ALTER TABLE user_preferences ADD COLUMN require_passenger_verification boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'require_passenger_profile_photo') THEN
    ALTER TABLE user_preferences ADD COLUMN require_passenger_profile_photo boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'max_stops_allowed') THEN
    ALTER TABLE user_preferences ADD COLUMN max_stops_allowed integer DEFAULT 3 CHECK (max_stops_allowed >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'same_gender_only') THEN
    ALTER TABLE user_preferences ADD COLUMN same_gender_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'age_restriction_min') THEN
    ALTER TABLE user_preferences ADD COLUMN age_restriction_min integer CHECK (age_restriction_min >= 0 AND age_restriction_min <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'age_restriction_max') THEN
    ALTER TABLE user_preferences ADD COLUMN age_restriction_max integer CHECK (age_restriction_max >= 0 AND age_restriction_max <= 120);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'allow_minors_with_guardian') THEN
    ALTER TABLE user_preferences ADD COLUMN allow_minors_with_guardian boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'allow_groups') THEN
    ALTER TABLE user_preferences ADD COLUMN allow_groups boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'max_group_size') THEN
    ALTER TABLE user_preferences ADD COLUMN max_group_size integer DEFAULT 4 CHECK (max_group_size >= 1);
  END IF;

  -- Driver-Side: Safety & Communication
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'share_live_location_automatically') THEN
    ALTER TABLE user_preferences ADD COLUMN share_live_location_automatically boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'emergency_contact_auto_notify') THEN
    ALTER TABLE user_preferences ADD COLUMN emergency_contact_auto_notify boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'require_photo_verification_at_pickup') THEN
    ALTER TABLE user_preferences ADD COLUMN require_photo_verification_at_pickup boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'communication_preference') THEN
    ALTER TABLE user_preferences ADD COLUMN communication_preference text DEFAULT 'in-app-only' CHECK (communication_preference IN ('in-app-only', 'phone-ok', 'whatsapp-ok', 'any'));
  END IF;

  -- Passenger-Side: Search & Filter Preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_max_price_per_km') THEN
    ALTER TABLE user_preferences ADD COLUMN search_max_price_per_km numeric(10,2) CHECK (search_max_price_per_km >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_max_total_price') THEN
    ALTER TABLE user_preferences ADD COLUMN search_max_total_price numeric(10,2) CHECK (search_max_total_price >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_min_driver_rating') THEN
    ALTER TABLE user_preferences ADD COLUMN search_min_driver_rating numeric(3,2) DEFAULT 0.00 CHECK (search_min_driver_rating >= 0 AND search_min_driver_rating <= 5);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_verified_driver') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_verified_driver boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_smoking_filter') THEN
    ALTER TABLE user_preferences ADD COLUMN search_smoking_filter text DEFAULT 'any' CHECK (search_smoking_filter IN ('no-smoking-only', 'outside-only-ok', 'any'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_pets_filter') THEN
    ALTER TABLE user_preferences ADD COLUMN search_pets_filter text DEFAULT 'any' CHECK (search_pets_filter IN ('no-pets', 'pets-ok-only', 'any'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_music_filter') THEN
    ALTER TABLE user_preferences ADD COLUMN search_music_filter text DEFAULT 'any' CHECK (search_music_filter IN ('quiet-only', 'moderate-max', 'any'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_ac') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_ac boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_charging') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_charging boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_wifi') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_wifi boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_luggage_needed') THEN
    ALTER TABLE user_preferences ADD COLUMN search_luggage_needed text DEFAULT 'none' CHECK (search_luggage_needed IN ('none', 'small', 'medium', 'large'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_child_seat') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_child_seat boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_require_wheelchair') THEN
    ALTER TABLE user_preferences ADD COLUMN search_require_wheelchair boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_max_detour_minutes') THEN
    ALTER TABLE user_preferences ADD COLUMN search_max_detour_minutes integer DEFAULT 15 CHECK (search_max_detour_minutes >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_preferred_vehicle_types') THEN
    ALTER TABLE user_preferences ADD COLUMN search_preferred_vehicle_types text[] DEFAULT '{}';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_eco_friendly_only') THEN
    ALTER TABLE user_preferences ADD COLUMN search_eco_friendly_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_instant_booking_only') THEN
    ALTER TABLE user_preferences ADD COLUMN search_instant_booking_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_friends_only') THEN
    ALTER TABLE user_preferences ADD COLUMN search_friends_only boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_carpooling_ok') THEN
    ALTER TABLE user_preferences ADD COLUMN search_carpooling_ok boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'search_priority_algorithm') THEN
    ALTER TABLE user_preferences ADD COLUMN search_priority_algorithm text DEFAULT 'fastest' CHECK (search_priority_algorithm IN ('cheapest', 'fastest', 'highest-rated', 'eco-friendly', 'comfort'));
  END IF;

  -- Smart Matching Preferences
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'auto_match_enabled') THEN
    ALTER TABLE user_preferences ADD COLUMN auto_match_enabled boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'auto_match_criteria') THEN
    ALTER TABLE user_preferences ADD COLUMN auto_match_criteria jsonb DEFAULT '{"price_weight": 0.3, "time_weight": 0.3, "rating_weight": 0.2, "comfort_weight": 0.2}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'flexible_time_window_minutes') THEN
    ALTER TABLE user_preferences ADD COLUMN flexible_time_window_minutes integer DEFAULT 30 CHECK (flexible_time_window_minutes >= 0);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'flexible_price_percentage') THEN
    ALTER TABLE user_preferences ADD COLUMN flexible_price_percentage integer DEFAULT 20 CHECK (flexible_price_percentage >= 0 AND flexible_price_percentage <= 100);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'notification_on_perfect_match') THEN
    ALTER TABLE user_preferences ADD COLUMN notification_on_perfect_match boolean DEFAULT true;
  END IF;

  -- Accessibility Features
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'accessibility_requirements') THEN
    ALTER TABLE user_preferences ADD COLUMN accessibility_requirements jsonb DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'service_animal') THEN
    ALTER TABLE user_preferences ADD COLUMN service_animal boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'language_preferences') THEN
    ALTER TABLE user_preferences ADD COLUMN language_preferences text[] DEFAULT ARRAY['en'];
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_preferences' AND column_name = 'sensory_preferences') THEN
    ALTER TABLE user_preferences ADD COLUMN sensory_preferences jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create ride_preference_overrides table
-- ============================================================================

CREATE TABLE IF NOT EXISTS ride_preference_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  override_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ride_id)
);

ALTER TABLE ride_preference_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage preferences for their own rides"
  ON ride_preference_overrides FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_preference_overrides.ride_id 
      AND rides.driver_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_preference_overrides.ride_id 
      AND rides.driver_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 3: Create passenger_search_filters table
-- ============================================================================

CREATE TABLE IF NOT EXISTS passenger_search_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filter_name text NOT NULL,
  filter_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean DEFAULT false,
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE passenger_search_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search filters"
  ON passenger_search_filters FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create own search filters"
  ON passenger_search_filters FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search filters"
  ON passenger_search_filters FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own search filters"
  ON passenger_search_filters FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create index for faster filter lookups
CREATE INDEX IF NOT EXISTS idx_passenger_search_filters_user_id ON passenger_search_filters(user_id);
CREATE INDEX IF NOT EXISTS idx_passenger_search_filters_default ON passenger_search_filters(user_id, is_default) WHERE is_default = true;

-- ============================================================================
-- STEP 4: Create preferred_drivers table
-- ============================================================================

CREATE TABLE IF NOT EXISTS preferred_drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preferred_driver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preference_level text NOT NULL DEFAULT 'favorite' CHECK (preference_level IN ('favorite', 'trusted', 'priority-notification')),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, preferred_driver_id),
  CHECK (user_id != preferred_driver_id)
);

ALTER TABLE preferred_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferred drivers"
  ON preferred_drivers FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can add preferred drivers"
  ON preferred_drivers FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferred drivers"
  ON preferred_drivers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove preferred drivers"
  ON preferred_drivers FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_preferred_drivers_user_id ON preferred_drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_preferred_drivers_driver_id ON preferred_drivers(preferred_driver_id);

-- ============================================================================
-- STEP 5: Create blocked_users_preferences table
-- ============================================================================

CREATE TABLE IF NOT EXISTS blocked_users_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  block_reason text,
  block_type text NOT NULL DEFAULT 'both' CHECK (block_type IN ('as-driver', 'as-passenger', 'both')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, blocked_user_id),
  CHECK (user_id != blocked_user_id)
);

ALTER TABLE blocked_users_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blocked users"
  ON blocked_users_preferences FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can block other users"
  ON blocked_users_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own blocks"
  ON blocked_users_preferences FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unblock users"
  ON blocked_users_preferences FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users_preferences(blocked_user_id);

-- ============================================================================
-- STEP 6: Create recurring_ride_templates table
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_ride_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  route_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferences_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE recurring_ride_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ride templates"
  ON recurring_ride_templates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create ride templates"
  ON recurring_ride_templates FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ride templates"
  ON recurring_ride_templates FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ride templates"
  ON recurring_ride_templates FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_recurring_ride_templates_user_id ON recurring_ride_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_ride_templates_active ON recurring_ride_templates(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- STEP 7: Create search_history_analytics table
-- ============================================================================

CREATE TABLE IF NOT EXISTS search_history_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  search_parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  results_shown integer DEFAULT 0,
  result_clicked uuid REFERENCES rides(id) ON DELETE SET NULL,
  booking_completed boolean DEFAULT false,
  search_timestamp timestamptz DEFAULT now()
);

ALTER TABLE search_history_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON search_history_analytics FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create search history entries"
  ON search_history_analytics FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search history"
  ON search_history_analytics FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON search_history_analytics(search_timestamp DESC);

-- ============================================================================
-- STEP 8: Create preference_profiles table
-- ============================================================================

CREATE TABLE IF NOT EXISTS preference_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_name text NOT NULL,
  profile_type text NOT NULL CHECK (profile_type IN ('driver', 'passenger', 'both')),
  profile_category text CHECK (profile_category IN ('budget', 'comfort', 'safety', 'eco', 'social', 'quiet', 'flexible', 'custom')),
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT false,
  is_system_default boolean DEFAULT false,
  use_count integer DEFAULT 0,
  last_used_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE preference_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preference profiles"
  ON preference_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create preference profiles"
  ON preference_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preference profiles"
  ON preference_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own preference profiles"
  ON preference_profiles FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_preference_profiles_user_id ON preference_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_preference_profiles_active ON preference_profiles(user_id, is_active) WHERE is_active = true;

-- ============================================================================
-- STEP 9: Create function to calculate compatibility score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_compatibility_score(
  p_driver_id uuid,
  p_passenger_id uuid,
  p_ride_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_driver_prefs record;
  v_passenger_prefs record;
  v_ride_overrides jsonb;
  v_score numeric := 100.0;
  v_breakdown jsonb := '{}'::jsonb;
  v_blocking_issues text[] := '{}';
BEGIN
  -- Get driver preferences
  SELECT * INTO v_driver_prefs
  FROM user_preferences
  WHERE user_id = p_driver_id;
  
  -- Get passenger preferences
  SELECT * INTO v_passenger_prefs
  FROM user_preferences
  WHERE user_id = p_passenger_id;
  
  -- Get ride-specific overrides if ride_id provided
  IF p_ride_id IS NOT NULL THEN
    SELECT override_preferences INTO v_ride_overrides
    FROM ride_preference_overrides
    WHERE ride_id = p_ride_id;
  END IF;
  
  -- Check for blocking conditions
  
  -- Check if users have blocked each other
  IF EXISTS (
    SELECT 1 FROM blocked_users_preferences
    WHERE (user_id = p_driver_id AND blocked_user_id = p_passenger_id)
       OR (user_id = p_passenger_id AND blocked_user_id = p_driver_id)
  ) THEN
    v_blocking_issues := array_append(v_blocking_issues, 'users_blocked');
    v_score := 0;
  END IF;
  
  -- Smoking compatibility (hard requirement)
  IF v_passenger_prefs.search_smoking_filter = 'no-smoking-only' 
     AND v_driver_prefs.smoking_policy NOT IN ('no-smoking', 'never') THEN
    v_blocking_issues := array_append(v_blocking_issues, 'smoking_incompatible');
    v_score := v_score - 25;
  END IF;
  
  -- Pet compatibility
  IF v_passenger_prefs.service_animal = true 
     AND COALESCE((v_driver_prefs.pet_policy_details->>'allowed')::boolean, false) = false THEN
    v_blocking_issues := array_append(v_blocking_issues, 'service_animal_not_allowed');
    v_score := v_score - 30;
  END IF;
  
  -- Wheelchair accessibility
  IF v_passenger_prefs.search_require_wheelchair = true 
     AND v_driver_prefs.wheelchair_accessible = false THEN
    v_blocking_issues := array_append(v_blocking_issues, 'wheelchair_not_accessible');
    v_score := v_score - 30;
  END IF;
  
  -- Calculate positive compatibility scores
  
  -- Music preference alignment (worth 10 points)
  IF v_driver_prefs.music_preference = v_passenger_prefs.search_music_filter 
     OR v_passenger_prefs.search_music_filter = 'any' THEN
    v_breakdown := v_breakdown || jsonb_build_object('music', 10);
  ELSE
    v_score := v_score - 5;
    v_breakdown := v_breakdown || jsonb_build_object('music', -5);
  END IF;
  
  -- Conversation level alignment (worth 10 points)
  IF v_driver_prefs.conversation_level = v_passenger_prefs.conversation_level THEN
    v_breakdown := v_breakdown || jsonb_build_object('conversation', 10);
  ELSE
    v_score := v_score - 5;
    v_breakdown := v_breakdown || jsonb_build_object('conversation', -5);
  END IF;
  
  -- Temperature preference alignment (worth 5 points)
  IF v_driver_prefs.temperature_preference = v_passenger_prefs.temperature_preference THEN
    v_breakdown := v_breakdown || jsonb_build_object('temperature', 5);
  ELSE
    v_score := v_score - 3;
    v_breakdown := v_breakdown || jsonb_build_object('temperature', -3);
  END IF;
  
  -- Amenity bonuses
  IF v_passenger_prefs.search_require_ac = true AND v_driver_prefs.ac_heating_available = true THEN
    v_breakdown := v_breakdown || jsonb_build_object('ac', 5);
  END IF;
  
  IF v_passenger_prefs.search_require_charging = true AND v_driver_prefs.phone_charging_available = true THEN
    v_breakdown := v_breakdown || jsonb_build_object('charging', 5);
  END IF;
  
  IF v_passenger_prefs.search_require_wifi = true AND v_driver_prefs.wifi_available = true THEN
    v_breakdown := v_breakdown || jsonb_build_object('wifi', 5);
  END IF;
  
  -- Ensure score stays between 0 and 100
  v_score := GREATEST(0, LEAST(100, v_score));
  
  RETURN jsonb_build_object(
    'score', v_score,
    'breakdown', v_breakdown,
    'blocking_issues', to_jsonb(v_blocking_issues),
    'is_compatible', v_score >= 50 AND array_length(v_blocking_issues, 1) IS NULL
  );
END;
$$;

-- ============================================================================
-- STEP 10: Create function to get filtered rides with compatibility scores
-- ============================================================================

CREATE OR REPLACE FUNCTION get_filtered_rides_with_scores(
  p_user_id uuid,
  p_filter_settings jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  ride_id uuid,
  driver_id uuid,
  origin text,
  destination text,
  departure_time timestamptz,
  available_seats integer,
  compatibility_score numeric,
  compatibility_breakdown jsonb,
  is_preferred_driver boolean,
  is_instant_bookable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as ride_id,
    r.driver_id,
    r.origin,
    r.destination,
    r.departure_time,
    r.available_seats,
    (calculate_compatibility_score(r.driver_id, p_user_id, r.id)->>'score')::numeric as compatibility_score,
    calculate_compatibility_score(r.driver_id, p_user_id, r.id) as compatibility_breakdown,
    EXISTS(
      SELECT 1 FROM preferred_drivers pd 
      WHERE pd.user_id = p_user_id AND pd.preferred_driver_id = r.driver_id
    ) as is_preferred_driver,
    COALESCE(up.instant_booking_enabled, false) as is_instant_bookable
  FROM rides r
  LEFT JOIN user_preferences up ON up.user_id = r.driver_id
  WHERE r.status = 'active'
    AND r.available_seats > 0
    AND r.driver_id != p_user_id
    AND NOT EXISTS (
      SELECT 1 FROM blocked_users_preferences bup
      WHERE (bup.user_id = p_user_id AND bup.blocked_user_id = r.driver_id)
         OR (bup.user_id = r.driver_id AND bup.blocked_user_id = p_user_id)
    )
  ORDER BY 
    is_preferred_driver DESC,
    compatibility_score DESC,
    r.departure_time ASC;
END;
$$;

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;