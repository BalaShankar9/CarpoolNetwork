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
          bio: string | null;
          date_of_birth: string | null;
          gender: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
          is_verified: boolean;
          verification_badge: 'email' | 'phone' | 'id' | 'background-check' | null;
          total_rides_offered: number;
          total_rides_taken: number;
          average_rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
          is_verified?: boolean;
          verification_badge?: 'email' | 'phone' | 'id' | 'background-check' | null;
          total_rides_offered?: number;
          total_rides_taken?: number;
          average_rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          date_of_birth?: string | null;
          gender?: 'male' | 'female' | 'non-binary' | 'prefer-not-to-say' | null;
          is_verified?: boolean;
          verification_badge?: 'email' | 'phone' | 'id' | 'background-check' | null;
          total_rides_offered?: number;
          total_rides_taken?: number;
          average_rating?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_preferences: {
        Row: {
          user_id: string;
          music_preference: 'none' | 'quiet' | 'moderate' | 'loud' | null;
          temperature_preference: 'cold' | 'cool' | 'moderate' | 'warm' | null;
          conversation_level: 'quiet' | 'moderate' | 'chatty' | null;
          smoking_policy: 'no-smoking' | 'outside-only' | 'allowed';
          pets_allowed: boolean;
          max_detour_minutes: number;
          gender_preference: 'any' | 'same' | 'male' | 'female';
          auto_accept_rides: boolean;
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
          type: 'ride-match' | 'booking-request' | 'booking-confirmed' | 'booking-cancelled' | 'message' | 'review' | 'safety-alert' | 'system';
          title: string;
          message: string;
          data: Json | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'ride-match' | 'booking-request' | 'booking-confirmed' | 'booking-cancelled' | 'message' | 'review' | 'safety-alert' | 'system';
          title: string;
          message: string;
          data?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'ride-match' | 'booking-request' | 'booking-confirmed' | 'booking-cancelled' | 'message' | 'review' | 'safety-alert' | 'system';
          title?: string;
          message?: string;
          data?: Json | null;
          is_read?: boolean;
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};
