import { supabase } from '../lib/supabase';

export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

export class ChatbotActions {
  static async postRide(userId: string, params: {
    origin: string;
    originLat: number;
    originLng: number;
    destination: string;
    destinationLat: number;
    destinationLng: number;
    departureTime: string;
    availableSeats: number;
    vehicleId?: string;
    notes?: string;
  }): Promise<ActionResult> {
    try {
      let vehicleId = params.vehicleId;

      if (!vehicleId) {
        const { data: vehicles } = await supabase
          .from('vehicles')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (!vehicles) {
          return {
            success: false,
            message: 'You need to add a vehicle first. Please go to your profile to add a vehicle.'
          };
        }
        vehicleId = vehicles.id;
      }

      const { data, error } = await supabase
        .from('rides')
        .insert({
          driver_id: userId,
          vehicle_id: vehicleId,
          origin: params.origin,
          origin_lat: params.originLat,
          origin_lng: params.originLng,
          destination: params.destination,
          destination_lat: params.destinationLat,
          destination_lng: params.destinationLng,
          departure_time: params.departureTime,
          available_seats: params.availableSeats,
          total_seats: params.availableSeats,
          notes: params.notes,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `Ride posted successfully! Your ride from ${params.origin} to ${params.destination} is now available for booking.`,
        data
      };
    } catch (error) {
      console.error('Error posting ride:', error);
      return {
        success: false,
        message: 'Failed to post ride. Please try again.'
      };
    }
  }

  static async bookRide(userId: string, params: {
    rideId: string;
    pickupLocation: string;
    pickupLat: number;
    pickupLng: number;
    dropoffLocation: string;
    dropoffLat: number;
    dropoffLng: number;
    seatsRequested?: number;
  }): Promise<ActionResult> {
    try {
      const { data: ride, error: rideError } = await supabase
        .from('rides')
        .select('available_seats, driver_id')
        .eq('id', params.rideId)
        .single();

      if (rideError || !ride) {
        return {
          success: false,
          message: 'Ride not found.'
        };
      }

      if (ride.driver_id === userId) {
        return {
          success: false,
          message: 'You cannot book your own ride.'
        };
      }

      const seatsRequested = params.seatsRequested || 1;

      if (ride.available_seats < seatsRequested) {
        return {
          success: false,
          message: `Not enough seats available. Only ${ride.available_seats} seat(s) remaining.`
        };
      }

      const { data, error } = await supabase
        .from('ride_bookings')
        .insert({
          ride_id: params.rideId,
          passenger_id: userId,
          pickup_location: params.pickupLocation,
          pickup_lat: params.pickupLat,
          pickup_lng: params.pickupLng,
          dropoff_location: params.dropoffLocation,
          dropoff_lat: params.dropoffLat,
          dropoff_lng: params.dropoffLng,
          seats_requested: seatsRequested,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `Booking request sent! Your booking ID is ${data.id}. The driver will review your request soon.`,
        data
      };
    } catch (error) {
      console.error('Error booking ride:', error);
      return {
        success: false,
        message: 'Failed to book ride. Please try again.'
      };
    }
  }

  static async cancelRide(userId: string, rideId: string, reason?: string): Promise<ActionResult> {
    try {
      const { data: ride, error: fetchError } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .eq('driver_id', userId)
        .single();

      if (fetchError || !ride) {
        return {
          success: false,
          message: 'Ride not found or you do not have permission to cancel it.'
        };
      }

      if (ride.status === 'cancelled') {
        return {
          success: false,
          message: 'This ride is already cancelled.'
        };
      }

      const { error: updateError } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', rideId);

      if (updateError) throw updateError;

      await supabase
        .from('ride_bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: reason || 'Ride cancelled by driver'
        })
        .eq('ride_id', rideId);

      return {
        success: true,
        message: 'Ride cancelled successfully. All bookings have been notified.'
      };
    } catch (error) {
      console.error('Error cancelling ride:', error);
      return {
        success: false,
        message: 'Failed to cancel ride. Please try again.'
      };
    }
  }

  static async cancelBooking(userId: string, bookingId: string, reason?: string): Promise<ActionResult> {
    try {
      const { error } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_reason: reason || 'Cancelled by passenger'
      });

      if (error) {
        if (error.message.includes('already cancelled')) {
          return {
            success: false,
            message: 'This booking is already cancelled.'
          };
        }
        if (error.message.includes('not found')) {
          return {
            success: false,
            message: 'Booking not found or you do not have permission to cancel it.'
          };
        }
        throw error;
      }

      return {
        success: true,
        message: 'Booking cancelled successfully.'
      };
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel booking. Please try again.'
      };
    }
  }

  static async updateProfile(userId: string, updates: {
    full_name?: string;
    phone?: string;
    whatsapp_number?: string;
    bio?: string;
    date_of_birth?: string;
    gender?: string;
    preferred_contact_method?: string;
  }): Promise<ActionResult> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Profile updated successfully!',
        data
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        message: 'Failed to update profile. Please try again.'
      };
    }
  }

  static async addVehicle(userId: string, vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    license_plate: string;
    capacity: number;
    fuel_type?: string;
    vehicle_type?: string;
  }): Promise<ActionResult> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          user_id: userId,
          ...vehicle,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: `Vehicle ${vehicle.make} ${vehicle.model} added successfully!`,
        data
      };
    } catch (error) {
      console.error('Error adding vehicle:', error);
      return {
        success: false,
        message: 'Failed to add vehicle. Please try again.'
      };
    }
  }

  static async updateVehicle(userId: string, vehicleId: string, updates: {
    make?: string;
    model?: string;
    year?: number;
    color?: string;
    license_plate?: string;
    capacity?: number;
    fuel_type?: string;
    vehicle_type?: string;
    is_active?: boolean;
  }): Promise<ActionResult> {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        message: 'Vehicle updated successfully!',
        data
      };
    } catch (error) {
      console.error('Error updating vehicle:', error);
      return {
        success: false,
        message: 'Failed to update vehicle. Please try again.'
      };
    }
  }

  static async updatePreferences(userId: string, preferences: {
    music_preference?: string;
    temperature_preference?: string;
    conversation_level?: string;
    smoking_policy?: string;
    pets_allowed?: boolean;
    max_detour_minutes?: number;
    gender_preference?: string;
    auto_accept_rides?: boolean;
  }): Promise<ActionResult> {
    try {
      const { data: existing } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let data, error;

      if (existing) {
        const result = await supabase
          .from('user_preferences')
          .update({
            ...preferences,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from('user_preferences')
          .insert({
            user_id: userId,
            ...preferences
          })
          .select()
          .single();
        data = result.data;
        error = result.error;
      }

      if (error) throw error;

      return {
        success: true,
        message: 'Preferences updated successfully!',
        data
      };
    } catch (error) {
      console.error('Error updating preferences:', error);
      return {
        success: false,
        message: 'Failed to update preferences. Please try again.'
      };
    }
  }
}
