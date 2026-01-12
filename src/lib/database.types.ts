export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
        profiles: {
          Row: {
            id: string;
            email: string;
            full_name: string;
            avatar_url: string | null;
            phone: string | null;
            phone_number: string | null;
            phone_e164: string | null;
            bio: string | null;
            city: string | null;
            country: string | null;
            country_of_residence: string | null;
            languages: string[] | null;
            date_of_birth: string | null;
            gender: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
            is_verified: boolean;
            email_verified: boolean | null;
            phone_verified: boolean | null;
            photo_verified: boolean | null;
            id_verified: boolean | null;
            verification_badge: 'email' | 'phone' | 'id' | 'background-check' | null;
            total_rides_offered: number;
            total_rides_taken: number;
            average_rating: number;
            created_at: string;
            updated_at: string;
            trust_score: number;
            profile_photo_path: string | null;
            profile_photo_url: string | null;
            profile_verified: boolean;
            reliability_score: number;
            is_admin: boolean;
            whatsapp_number: string | null;
            whatsapp_e164: string | null;
            phone_visibility: 'none' | 'friends' | 'ride_only' | 'anyone';
            whatsapp_visibility: 'none' | 'friends' | 'ride_only' | 'anyone';
            preferred_contact_method: 'in_app' | 'whatsapp' | 'both' | null;
            language: string | null;
            timezone: string | null;
            profile_completion_percentage: number | null;
            onboarding_completed: boolean;
            ethnicity: string | null;
            ethnicity_consent: boolean;
            ethnicity_visibility: 'none' | 'friends' | 'anyone';
          };
          Insert: {
            id: string;
            email: string;
            full_name: string;
            avatar_url?: string | null;
            phone?: string | null;
            phone_number?: string | null;
            phone_e164?: string | null;
            bio?: string | null;
            city?: string | null;
            country?: string | null;
            country_of_residence?: string | null;
            languages?: string[] | null;
            date_of_birth?: string | null;
            gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
            is_verified?: boolean;
            email_verified?: boolean | null;
            phone_verified?: boolean | null;
            photo_verified?: boolean | null;
            id_verified?: boolean | null;
            verification_badge?: 'email' | 'phone' | 'id' | 'background-check' | null;
            total_rides_offered?: number;
            total_rides_taken?: number;
            average_rating?: number;
            created_at?: string;
            updated_at?: string;
            trust_score?: number;
            profile_photo_path?: string | null;
            profile_photo_url?: string | null;
            profile_verified?: boolean;
            reliability_score?: number;
            is_admin?: boolean;
            whatsapp_number?: string | null;
            whatsapp_e164?: string | null;
            phone_visibility?: 'none' | 'friends' | 'ride_only' | 'anyone';
            whatsapp_visibility?: 'none' | 'friends' | 'ride_only' | 'anyone';
            preferred_contact_method?: 'in_app' | 'whatsapp' | 'both' | null;
            language?: string | null;
            timezone?: string | null;
            profile_completion_percentage?: number | null;
            onboarding_completed?: boolean;
            ethnicity?: string | null;
            ethnicity_consent?: boolean;
            ethnicity_visibility?: 'none' | 'friends' | 'anyone';
          };
          Update: {
            id?: string;
            email?: string;
            full_name?: string;
            avatar_url?: string | null;
            phone?: string | null;
            phone_number?: string | null;
            phone_e164?: string | null;
            bio?: string | null;
            city?: string | null;
            country?: string | null;
            country_of_residence?: string | null;
            languages?: string[] | null;
            date_of_birth?: string | null;
            gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
            is_verified?: boolean;
            email_verified?: boolean | null;
            phone_verified?: boolean | null;
            photo_verified?: boolean | null;
            id_verified?: boolean | null;
            verification_badge?: 'email' | 'phone' | 'id' | 'background-check' | null;
            total_rides_offered?: number;
            total_rides_taken?: number;
            average_rating?: number;
            created_at?: string;
            updated_at?: string;
            trust_score?: number;
            profile_photo_path?: string | null;
            profile_photo_url?: string | null;
            profile_verified?: boolean;
            reliability_score?: number;
            is_admin?: boolean;
            whatsapp_number?: string | null;
            whatsapp_e164?: string | null;
            phone_visibility?: 'none' | 'friends' | 'ride_only' | 'anyone';
            whatsapp_visibility?: 'none' | 'friends' | 'ride_only' | 'anyone';
            preferred_contact_method?: 'in_app' | 'whatsapp' | 'both' | null;
            language?: string | null;
            timezone?: string | null;
            profile_completion_percentage?: number | null;
            onboarding_completed?: boolean;
            ethnicity?: string | null;
            ethnicity_consent?: boolean;
            ethnicity_visibility?: 'none' | 'friends' | 'anyone';
          };
        };
      user_preferences: {
        Row: {
          user_id: string;
          // Original preferences
          music_preference: 'none' | 'quiet' | 'moderate' | 'loud' | null;
          temperature_preference: 'cold' | 'cool' | 'moderate' | 'warm' | null;
          conversation_level: 'quiet' | 'moderate' | 'chatty' | null;
          smoking_policy: 'no-smoking' | 'outside-only' | 'allowed';
          pets_allowed: boolean;
          max_detour_minutes: number;
          gender_preference: 'any' | 'same' | 'male' | 'female';
          auto_accept_rides: boolean;
          // Driver-side: Vehicle & Comfort
          luggage_policy: 'none' | 'small-bags-only' | 'medium-allowed' | 'large-allowed';
          food_drinks_allowed: 'none' | 'drinks-only' | 'snacks-ok' | 'meals-ok';
          child_seats_available: number;
          wheelchair_accessible: boolean;
          pet_policy_details: Json;
          music_genres_preferred: string[];
          ac_heating_available: boolean;
          phone_charging_available: boolean;
          wifi_available: boolean;
          luggage_space_description: string | null;
          special_equipment: string[];
          // Driver-side: Passenger Screening
          instant_booking_enabled: boolean;
          minimum_passenger_rating: number;
          require_passenger_verification: boolean;
          require_passenger_profile_photo: boolean;
          max_stops_allowed: number;
          same_gender_only: boolean;
          age_restriction_min: number | null;
          age_restriction_max: number | null;
          allow_minors_with_guardian: boolean;
          allow_groups: boolean;
          max_group_size: number;
          // Driver-side: Safety & Communication
          share_live_location_automatically: boolean;
          emergency_contact_auto_notify: boolean;
          require_photo_verification_at_pickup: boolean;
          communication_preference: 'in-app-only' | 'phone-ok' | 'whatsapp-ok' | 'any';
          // Passenger-side: Search Filters
          search_max_price_per_km: number | null;
          search_max_total_price: number | null;
          search_min_driver_rating: number;
          search_require_verified_driver: boolean;
          search_smoking_filter: 'no-smoking-only' | 'outside-only-ok' | 'any';
          search_pets_filter: 'no-pets' | 'pets-ok-only' | 'any';
          search_music_filter: 'quiet-only' | 'moderate-max' | 'any';
          search_require_ac: boolean;
          search_require_charging: boolean;
          search_require_wifi: boolean;
          search_luggage_needed: 'none' | 'small' | 'medium' | 'large';
          search_require_child_seat: boolean;
          search_require_wheelchair: boolean;
          search_max_detour_minutes: number;
          search_preferred_vehicle_types: string[];
          search_eco_friendly_only: boolean;
          search_instant_booking_only: boolean;
          search_friends_only: boolean;
          search_carpooling_ok: boolean;
          search_priority_algorithm: 'cheapest' | 'fastest' | 'highest-rated' | 'eco-friendly' | 'comfort';
          // Smart Matching
          auto_match_enabled: boolean;
          auto_match_criteria: Json;
          flexible_time_window_minutes: number;
          flexible_price_percentage: number;
          notification_on_perfect_match: boolean;
          // Accessibility
          accessibility_requirements: Json;
          service_animal: boolean;
          language_preferences: string[];
          sensory_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          music_preference?: 'none' | 'quiet' | 'moderate' | 'loud' | null;
          temperature_preference?: 'cold' | 'cool' | 'moderate' | 'warm' | null;
          conversation_level?: 'quiet' | 'moderate' | 'chatty' | null;
          smoking_policy?: 'no-smoking' | 'outside-only' | 'allowed';
          pets_allowed?: boolean;
          max_detour_minutes?: number;
          gender_preference?: 'any' | 'same' | 'male' | 'female';
          auto_accept_rides?: boolean;
          luggage_policy?: 'none' | 'small-bags-only' | 'medium-allowed' | 'large-allowed';
          food_drinks_allowed?: 'none' | 'drinks-only' | 'snacks-ok' | 'meals-ok';
          child_seats_available?: number;
          wheelchair_accessible?: boolean;
          pet_policy_details?: Json;
          music_genres_preferred?: string[];
          ac_heating_available?: boolean;
          phone_charging_available?: boolean;
          wifi_available?: boolean;
          luggage_space_description?: string | null;
          special_equipment?: string[];
          instant_booking_enabled?: boolean;
          minimum_passenger_rating?: number;
          require_passenger_verification?: boolean;
          require_passenger_profile_photo?: boolean;
          max_stops_allowed?: number;
          same_gender_only?: boolean;
          age_restriction_min?: number | null;
          age_restriction_max?: number | null;
          allow_minors_with_guardian?: boolean;
          allow_groups?: boolean;
          max_group_size?: number;
          share_live_location_automatically?: boolean;
          emergency_contact_auto_notify?: boolean;
          require_photo_verification_at_pickup?: boolean;
          communication_preference?: 'in-app-only' | 'phone-ok' | 'whatsapp-ok' | 'any';
          search_max_price_per_km?: number | null;
          search_max_total_price?: number | null;
          search_min_driver_rating?: number;
          search_require_verified_driver?: boolean;
          search_smoking_filter?: 'no-smoking-only' | 'outside-only-ok' | 'any';
          search_pets_filter?: 'no-pets' | 'pets-ok-only' | 'any';
          search_music_filter?: 'quiet-only' | 'moderate-max' | 'any';
          search_require_ac?: boolean;
          search_require_charging?: boolean;
          search_require_wifi?: boolean;
          search_luggage_needed?: 'none' | 'small' | 'medium' | 'large';
          search_require_child_seat?: boolean;
          search_require_wheelchair?: boolean;
          search_max_detour_minutes?: number;
          search_preferred_vehicle_types?: string[];
          search_eco_friendly_only?: boolean;
          search_instant_booking_only?: boolean;
          search_friends_only?: boolean;
          search_carpooling_ok?: boolean;
          search_priority_algorithm?: 'cheapest' | 'fastest' | 'highest-rated' | 'eco-friendly' | 'comfort';
          auto_match_enabled?: boolean;
          auto_match_criteria?: Json;
          flexible_time_window_minutes?: number;
          flexible_price_percentage?: number;
          notification_on_perfect_match?: boolean;
          accessibility_requirements?: Json;
          service_animal?: boolean;
          language_preferences?: string[];
          sensory_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          music_preference?: 'none' | 'quiet' | 'moderate' | 'loud' | null;
          temperature_preference?: 'cold' | 'cool' | 'moderate' | 'warm' | null;
          conversation_level?: 'quiet' | 'moderate' | 'chatty' | null;
          smoking_policy?: 'no-smoking' | 'outside-only' | 'allowed';
          pets_allowed?: boolean;
          max_detour_minutes?: number;
          gender_preference?: 'any' | 'same' | 'male' | 'female';
          auto_accept_rides?: boolean;
          luggage_policy?: 'none' | 'small-bags-only' | 'medium-allowed' | 'large-allowed';
          food_drinks_allowed?: 'none' | 'drinks-only' | 'snacks-ok' | 'meals-ok';
          child_seats_available?: number;
          wheelchair_accessible?: boolean;
          pet_policy_details?: Json;
          music_genres_preferred?: string[];
          ac_heating_available?: boolean;
          phone_charging_available?: boolean;
          wifi_available?: boolean;
          luggage_space_description?: string | null;
          special_equipment?: string[];
          instant_booking_enabled?: boolean;
          minimum_passenger_rating?: number;
          require_passenger_verification?: boolean;
          require_passenger_profile_photo?: boolean;
          max_stops_allowed?: number;
          same_gender_only?: boolean;
          age_restriction_min?: number | null;
          age_restriction_max?: number | null;
          allow_minors_with_guardian?: boolean;
          allow_groups?: boolean;
          max_group_size?: number;
          share_live_location_automatically?: boolean;
          emergency_contact_auto_notify?: boolean;
          require_photo_verification_at_pickup?: boolean;
          communication_preference?: 'in-app-only' | 'phone-ok' | 'whatsapp-ok' | 'any';
          search_max_price_per_km?: number | null;
          search_max_total_price?: number | null;
          search_min_driver_rating?: number;
          search_require_verified_driver?: boolean;
          search_smoking_filter?: 'no-smoking-only' | 'outside-only-ok' | 'any';
          search_pets_filter?: 'no-pets' | 'pets-ok-only' | 'any';
          search_music_filter?: 'quiet-only' | 'moderate-max' | 'any';
          search_require_ac?: boolean;
          search_require_charging?: boolean;
          search_require_wifi?: boolean;
          search_luggage_needed?: 'none' | 'small' | 'medium' | 'large';
          search_require_child_seat?: boolean;
          search_require_wheelchair?: boolean;
          search_max_detour_minutes?: number;
          search_preferred_vehicle_types?: string[];
          search_eco_friendly_only?: boolean;
          search_instant_booking_only?: boolean;
          search_friends_only?: boolean;
          search_carpooling_ok?: boolean;
          search_priority_algorithm?: 'cheapest' | 'fastest' | 'highest-rated' | 'eco-friendly' | 'comfort';
          auto_match_enabled?: boolean;
          auto_match_criteria?: Json;
          flexible_time_window_minutes?: number;
          flexible_price_percentage?: number;
          notification_on_perfect_match?: boolean;
          accessibility_requirements?: Json;
          service_animal?: boolean;
          language_preferences?: string[];
          sensory_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          color: string;
          license_plate: string;
          capacity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          fuel_type: string | null;
          vehicle_type: string | null;
          registration_year: number | null;
          engine_capacity: number | null;
          image_url: string | null;
          vehicle_photo_url: string | null;
          vehicle_front_photo_path: string | null;
          vehicle_front_photo_thumb_path: string | null;
          vehicle_verified: boolean | null;
          plate_ocr_text: string | null;
          plate_verified_at: string | null;
          mot_status: string | null;
          mot_expiry_date: string | null;
          tax_status: string | null;
          tax_due_date: string | null;
          plate_verified: boolean | null;
          plate_verification_date: string | null;
          extracted_plate_text: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          color: string;
          license_plate: string;
          capacity: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          fuel_type?: string | null;
          vehicle_type?: string | null;
          registration_year?: number | null;
          engine_capacity?: number | null;
          image_url?: string | null;
          vehicle_photo_url?: string | null;
          vehicle_front_photo_path?: string | null;
          vehicle_front_photo_thumb_path?: string | null;
          vehicle_verified?: boolean | null;
          plate_ocr_text?: string | null;
          plate_verified_at?: string | null;
          mot_status?: string | null;
          mot_expiry_date?: string | null;
          tax_status?: string | null;
          tax_due_date?: string | null;
          plate_verified?: boolean | null;
          plate_verification_date?: string | null;
          extracted_plate_text?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          make?: string;
          model?: string;
          year?: number;
          color?: string;
          license_plate?: string;
          capacity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          fuel_type?: string | null;
          vehicle_type?: string | null;
          registration_year?: number | null;
          engine_capacity?: number | null;
          image_url?: string | null;
          vehicle_photo_url?: string | null;
          vehicle_front_photo_path?: string | null;
          vehicle_front_photo_thumb_path?: string | null;
          vehicle_verified?: boolean | null;
          plate_ocr_text?: string | null;
          plate_verified_at?: string | null;
          mot_status?: string | null;
          mot_expiry_date?: string | null;
          tax_status?: string | null;
          tax_due_date?: string | null;
          plate_verified?: boolean | null;
          plate_verification_date?: string | null;
          extracted_plate_text?: string | null;
        };
      };
      rides: {
        Row: {
          id: string;
          driver_id: string;
          vehicle_id: string;
          origin: string;
          origin_lat: number;
          origin_lng: number;
          destination: string;
          destination_lat: number;
          destination_lng: number;
          departure_time: string;
          available_seats: number;
          total_seats: number;
          status: 'active' | 'in-progress' | 'completed' | 'cancelled';
          is_recurring: boolean;
          recurrence_pattern: Json | null;
          notes: string | null;
          route_polyline: string | null;
          estimated_duration: number | null;
          estimated_distance: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          vehicle_id: string;
          origin: string;
          origin_lat: number;
          origin_lng: number;
          destination: string;
          destination_lat: number;
          destination_lng: number;
          departure_time: string;
          available_seats: number;
          total_seats: number;
          status?: 'active' | 'in-progress' | 'completed' | 'cancelled';
          is_recurring?: boolean;
          recurrence_pattern?: Json | null;
          notes?: string | null;
          route_polyline?: string | null;
          estimated_duration?: number | null;
          estimated_distance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          vehicle_id?: string;
          origin?: string;
          origin_lat?: number;
          origin_lng?: number;
          destination?: string;
          destination_lat?: number;
          destination_lng?: number;
          departure_time?: string;
          available_seats?: number;
          total_seats?: number;
          status?: 'active' | 'in-progress' | 'completed' | 'cancelled';
          is_recurring?: boolean;
          recurrence_pattern?: Json | null;
          notes?: string | null;
          route_polyline?: string | null;
          estimated_duration?: number | null;
          estimated_distance?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ride_bookings: {
        Row: {
          id: string;
          ride_id: string;
          passenger_id: string;
          pickup_location: string;
          pickup_lat: number;
          pickup_lng: number;
          dropoff_location: string;
          dropoff_lat: number;
          dropoff_lng: number;
          seats_requested: number;
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          pickup_order: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          passenger_id: string;
          pickup_location: string;
          pickup_lat: number;
          pickup_lng: number;
          dropoff_location: string;
          dropoff_lat: number;
          dropoff_lng: number;
          seats_requested?: number;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          pickup_order?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          passenger_id?: string;
          pickup_location?: string;
          pickup_lat?: number;
          pickup_lng?: number;
          dropoff_location?: string;
          dropoff_lat?: number;
          dropoff_lng?: number;
          seats_requested?: number;
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
          pickup_order?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          ride_id: string | null;
          content: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          ride_id?: string | null;
          content: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          ride_id?: string | null;
          content?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          ride_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment: string | null;
          review_type: 'driver' | 'passenger';
          created_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          reviewer_id: string;
          reviewee_id: string;
          rating: number;
          comment?: string | null;
          review_type: 'driver' | 'passenger';
          created_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          rating?: number;
          comment?: string | null;
          review_type?: 'driver' | 'passenger';
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'NEW_MESSAGE' | 'FRIEND_REQUEST' | 'FRIEND_REQUEST_ACCEPTED' | 'FORUM_REPLY' | 'FORUM_MENTION' | 'RIDE_MATCH' | 'BOOKING_REQUEST' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'REVIEW' | 'SAFETY_ALERT' | 'SYSTEM';
          data: Json | null;
          read_at: string | null;
          is_read?: boolean | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'NEW_MESSAGE' | 'FRIEND_REQUEST' | 'FRIEND_REQUEST_ACCEPTED' | 'FORUM_REPLY' | 'FORUM_MENTION' | 'RIDE_MATCH' | 'BOOKING_REQUEST' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'REVIEW' | 'SAFETY_ALERT' | 'SYSTEM';
          data?: Json | null;
          read_at?: string | null;
          is_read?: boolean | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'NEW_MESSAGE' | 'FRIEND_REQUEST' | 'FRIEND_REQUEST_ACCEPTED' | 'FORUM_REPLY' | 'FORUM_MENTION' | 'RIDE_MATCH' | 'BOOKING_REQUEST' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'REVIEW' | 'SAFETY_ALERT' | 'SYSTEM';
          data?: Json | null;
          read_at?: string | null;
          is_read?: boolean | null;
          created_at?: string;
        };
      };
      saved_locations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          address: string;
          latitude: number;
          longitude: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          created_at?: string;
        };
      };
      ride_preference_overrides: {
        Row: {
          id: string;
          ride_id: string;
          override_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ride_id: string;
          override_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ride_id?: string;
          override_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      passenger_search_filters: {
        Row: {
          id: string;
          user_id: string;
          filter_name: string;
          filter_settings: Json;
          is_default: boolean;
          use_count: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          filter_name: string;
          filter_settings?: Json;
          is_default?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          filter_name?: string;
          filter_settings?: Json;
          is_default?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      preferred_drivers: {
        Row: {
          id: string;
          user_id: string;
          preferred_driver_id: string;
          preference_level: 'favorite' | 'trusted' | 'priority-notification';
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          preferred_driver_id: string;
          preference_level?: 'favorite' | 'trusted' | 'priority-notification';
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          preferred_driver_id?: string;
          preference_level?: 'favorite' | 'trusted' | 'priority-notification';
          notes?: string | null;
          created_at?: string;
        };
      };
      blocked_users_preferences: {
        Row: {
          id: string;
          user_id: string;
          blocked_user_id: string;
          block_reason: string | null;
          block_type: 'as-driver' | 'as-passenger' | 'both';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          blocked_user_id: string;
          block_reason?: string | null;
          block_type?: 'as-driver' | 'as-passenger' | 'both';
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          blocked_user_id?: string;
          block_reason?: string | null;
          block_type?: 'as-driver' | 'as-passenger' | 'both';
          created_at?: string;
        };
      };
      recurring_ride_templates: {
        Row: {
          id: string;
          user_id: string;
          template_name: string;
          route_data: Json;
          schedule_data: Json;
          preferences_data: Json;
          vehicle_id: string | null;
          is_active: boolean;
          use_count: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          template_name: string;
          route_data?: Json;
          schedule_data?: Json;
          preferences_data?: Json;
          vehicle_id?: string | null;
          is_active?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          template_name?: string;
          route_data?: Json;
          schedule_data?: Json;
          preferences_data?: Json;
          vehicle_id?: string | null;
          is_active?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      search_history_analytics: {
        Row: {
          id: string;
          user_id: string;
          search_parameters: Json;
          results_shown: number;
          result_clicked: string | null;
          booking_completed: boolean;
          search_timestamp: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          search_parameters?: Json;
          results_shown?: number;
          result_clicked?: string | null;
          booking_completed?: boolean;
          search_timestamp?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          search_parameters?: Json;
          results_shown?: number;
          result_clicked?: string | null;
          booking_completed?: boolean;
          search_timestamp?: string;
        };
      };
      preference_profiles: {
        Row: {
          id: string;
          user_id: string;
          profile_name: string;
          profile_type: 'driver' | 'passenger' | 'both';
          profile_category: 'budget' | 'comfort' | 'safety' | 'eco' | 'social' | 'quiet' | 'flexible' | 'custom' | null;
          preferences: Json;
          is_active: boolean;
          is_system_default: boolean;
          use_count: number;
          last_used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          profile_name: string;
          profile_type: 'driver' | 'passenger' | 'both';
          profile_category?: 'budget' | 'comfort' | 'safety' | 'eco' | 'social' | 'quiet' | 'flexible' | 'custom' | null;
          preferences?: Json;
          is_active?: boolean;
          is_system_default?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_name?: string;
          profile_type?: 'driver' | 'passenger' | 'both';
          profile_category?: 'budget' | 'comfort' | 'safety' | 'eco' | 'social' | 'quiet' | 'flexible' | 'custom' | null;
          preferences?: Json;
          is_active?: boolean;
          is_system_default?: boolean;
          use_count?: number;
          last_used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ============================================================================
      // MESSAGING TABLES (Required for chat functionality)
      // ============================================================================
      conversations: {
        Row: {
          id: string;
          type: 'RIDE' | 'TRIP' | 'FRIENDS_DM' | 'GROUP';
          ride_id: string | null;
          created_at: string;
          updated_at: string;
          last_message_id: string | null;
          last_message_at: string | null;
          last_message_preview: string | null;
          last_sender_id: string | null;
        };
        Insert: {
          id?: string;
          type: 'RIDE' | 'TRIP' | 'FRIENDS_DM' | 'GROUP';
          ride_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          last_sender_id?: string | null;
        };
        Update: {
          id?: string;
          type?: 'RIDE' | 'TRIP' | 'FRIENDS_DM' | 'GROUP';
          ride_id?: string | null;
          created_at?: string;
          updated_at?: string;
          last_message_id?: string | null;
          last_message_at?: string | null;
          last_message_preview?: string | null;
          last_sender_id?: string | null;
        };
      };
      conversation_members: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: 'DRIVER' | 'RIDER' | 'FRIEND' | 'ADMIN' | 'MEMBER';
          joined_at: string;
          last_read_at: string | null;
          last_seen_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: 'DRIVER' | 'RIDER' | 'FRIEND' | 'ADMIN' | 'MEMBER';
          joined_at?: string;
          last_read_at?: string | null;
          last_seen_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: 'DRIVER' | 'RIDER' | 'FRIEND' | 'ADMIN' | 'MEMBER';
          joined_at?: string;
          last_read_at?: string | null;
          last_seen_at?: string | null;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type: 'TEXT' | 'IMAGE' | 'LOCATION' | 'SYSTEM' | 'RIDE_UPDATE';
          metadata: Json | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          message_type?: 'TEXT' | 'IMAGE' | 'LOCATION' | 'SYSTEM' | 'RIDE_UPDATE';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          message_type?: 'TEXT' | 'IMAGE' | 'LOCATION' | 'SYSTEM' | 'RIDE_UPDATE';
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      message_reads: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          last_read_message_id: string | null;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          last_read_message_id?: string | null;
          last_read_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          last_read_message_id?: string | null;
          last_read_at?: string;
        };
      };
      blocks: {
        Row: {
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
        Insert: {
          blocker_id: string;
          blocked_id: string;
          created_at?: string;
        };
        Update: {
          blocker_id?: string;
          blocked_id?: string;
          created_at?: string;
        };
      };
      // ============================================================================
      // RECURRING RIDES TABLE (Required for recurring ride patterns)
      // ============================================================================
      recurring_ride_patterns: {
        Row: {
          id: string;
          driver_id: string;
          vehicle_id: string;
          origin: string;
          origin_lat: number;
          origin_lng: number;
          destination: string;
          destination_lat: number;
          destination_lng: number;
          departure_time: string;
          days_of_week: number[];
          available_seats: number;
          notes: string | null;
          is_active: boolean;
          valid_from: string;
          valid_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          driver_id: string;
          vehicle_id: string;
          origin: string;
          origin_lat: number;
          origin_lng: number;
          destination: string;
          destination_lat: number;
          destination_lng: number;
          departure_time: string;
          days_of_week: number[];
          available_seats: number;
          notes?: string | null;
          is_active?: boolean;
          valid_from?: string;
          valid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          driver_id?: string;
          vehicle_id?: string;
          origin?: string;
          origin_lat?: number;
          origin_lng?: number;
          destination?: string;
          destination_lat?: number;
          destination_lng?: number;
          departure_time?: string;
          days_of_week?: number[];
          available_seats?: number;
          notes?: string | null;
          is_active?: boolean;
          valid_from?: string;
          valid_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // ============================================================================
      // ADMIN TABLES (Required for RBAC)
      // ============================================================================
      admin_permissions: {
        Row: {
          id: string;
          role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
          permission: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
          permission: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: 'super_admin' | 'admin' | 'moderator' | 'analyst';
          permission?: string;
          created_at?: string;
        };
      };
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string | null;
          admin_role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
          action: string;
          target_type: string | null;
          target_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          admin_role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
          action: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          admin_role?: 'super_admin' | 'admin' | 'moderator' | 'analyst';
          action?: string;
          target_type?: string | null;
          target_id?: string | null;
          details?: Json;
          created_at?: string;
        };
      };
      };
      Views: {
        profile_public_v: {
          Row: {
            id: string;
            full_name: string;
            avatar_url: string | null;
            profile_photo_url: string | null;
            created_at: string;
            country_of_residence: string | null;
            country: string | null;
            city: string | null;
            bio: string | null;
            languages: string[] | null;
            phone_verified: boolean | null;
            email_verified: boolean | null;
            photo_verified: boolean | null;
            id_verified: boolean | null;
            profile_verified: boolean;
            preferred_contact_method: string | null;
            allow_inhouse_chat: boolean | null;
            allow_whatsapp_chat: boolean | null;
            trust_score: number;
            average_rating: number;
            reliability_score: number;
            total_rides_offered: number;
            total_rides_taken: number;
            phone_visibility: 'none' | 'friends' | 'ride_only' | 'anyone';
            whatsapp_visibility: 'none' | 'friends' | 'ride_only' | 'anyone';
          };
        };
      };
      Functions: {
        can_view_phone: {
          Args: {
            p_viewer: string;
            p_owner: string;
          };
          Returns: boolean;
        };
        calculate_compatibility_score: {
          Args: {
            p_driver_id: string;
            p_passenger_id: string;
            p_ride_id?: string;
          };
          Returns: Json;
        };
        get_filtered_rides_with_scores: {
          Args: {
            p_user_id: string;
            p_filter_settings?: Json;
          };
          Returns: {
            ride_id: string;
            driver_id: string;
            origin: string;
            destination: string;
            departure_time: string;
            available_seats: number;
            compatibility_score: number;
            compatibility_breakdown: Json;
            is_preferred_driver: boolean;
            is_instant_bookable: boolean;
          }[];
        };
        is_profile_complete: {
          Args: {
            p_user_id?: string;
          };
          Returns: boolean;
        };
        // ============================================================================
        // MESSAGING RPC FUNCTIONS
        // ============================================================================
        get_conversations_overview: {
          Args: Record<string, never>;
          Returns: {
            conversation_id: string;
            conversation_type: string;
            ride_id: string | null;
            other_user_id: string;
            other_user_name: string;
            other_user_avatar: string | null;
            last_message_content: string | null;
            last_message_at: string | null;
            last_sender_id: string | null;
            unread_count: number;
            my_role: string;
          }[];
        };
        get_or_create_dm_conversation: {
          Args: {
            p_other_user_id: string;
          };
          Returns: string;
        };
        get_or_create_ride_conversation: {
          Args: {
            p_ride_id: string;
            p_driver_id: string;
            p_rider_id: string;
          };
          Returns: string;
        };
        mark_conversation_read: {
          Args: {
            p_conversation_id: string;
          };
          Returns: void;
        };
        is_blocked: {
          Args: {
            p_user_id: string;
            p_other_user_id: string;
          };
          Returns: boolean;
        };
        // ============================================================================
        // BOOKING RPC FUNCTIONS
        // ============================================================================
        request_booking: {
          Args: {
            p_ride_id: string;
            p_pickup_location: string;
            p_pickup_lat: number;
            p_pickup_lng: number;
            p_dropoff_location: string;
            p_dropoff_lat: number;
            p_dropoff_lng: number;
            p_seats_requested?: number;
          };
          Returns: string;
        };
        cancel_booking: {
          Args: {
            p_booking_id: string;
            p_reason?: string;
          };
          Returns: void;
        };
        driver_decide_booking: {
          Args: {
            p_booking_id: string;
            p_decision: 'confirm' | 'decline';
          };
          Returns: void;
        };
        // ============================================================================
        // ADMIN RPC FUNCTIONS
        // ============================================================================
        has_admin_permission: {
          Args: {
            p_permission: string;
          };
          Returns: boolean;
        };
        user_can_view_ride: {
          Args: {
            p_ride_id: string;
          };
          Returns: boolean;
        };
      };
    Enums: {
      admin_role: 'super_admin' | 'admin' | 'moderator' | 'analyst';
    };
  };
};

