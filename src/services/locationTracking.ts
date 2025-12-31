import { supabase } from '../lib/supabase';
import { logApiError } from './errorTracking';

interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

class LocationTracker {
  private watchId: number | null = null;
  private updateInterval: number = 10000;
  private currentRideId: string | null = null;
  private isTracking = false;

  async startTracking(rideId: string) {
    if (this.isTracking) {
      console.log('Already tracking location');
      return;
    }

    if (!('geolocation' in navigator)) {
      await logApiError(
        'geolocation_not_supported',
        new Error('Geolocation not supported'),
        { extra: { rideId: rideId || this.currentRideId } }
      );
      return;
    }

    this.currentRideId = rideId;
    this.isTracking = true;

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5000,
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      options
    );

    console.log('Started location tracking for ride:', rideId);
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    this.isTracking = false;
    this.currentRideId = null;
    console.log('Stopped location tracking');
  }

  private async handlePosition(position: GeolocationPosition) {
    const locationData: LocationUpdate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed || undefined,
      heading: position.coords.heading || undefined,
    };

    try {
      await this.updateLocation(locationData);

      await this.saveToHistory(locationData);
    } catch (error) {
      await logApiError('location_tracking', error, {
        extra: { context: 'location_tracking', rideId: this.currentRideId },
      });
    }
  }

  private handleError(error: GeolocationPositionError) {
    let message = 'Unknown geolocation error';

    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
    }

    void logApiError('geolocation_error', new Error(message), {
      extra: {
        error_code: error.code,
        error_message: error.message,
        rideId: this.currentRideId,
      },
    });
  }

  private async updateLocation(location: LocationUpdate) {
    try {
      const { error } = await supabase.rpc('update_live_location', {
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_ride_id: this.currentRideId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update live location:', error);
      throw error;
    }
  }

  private async saveToHistory(location: LocationUpdate) {
    if (!this.currentRideId) return;

    try {
      const { error } = await supabase.from('location_history').insert({
        ride_id: this.currentRideId,
        latitude: location.latitude,
        longitude: location.longitude,
        speed: location.speed,
        recorded_at: new Date().toISOString(),
      });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save location history:', error);
    }
  }

  async getCurrentLocation(): Promise<LocationUpdate | null> {
    if (!('geolocation' in navigator)) {
      return null;
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        }
      );
    });
  }

  async getLiveLocations(rideId: string) {
    try {
      const { data, error } = await supabase
        .from('live_locations')
        .select('*')
        .eq('ride_id', rideId)
        .gte('expires_at', new Date().toISOString());

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to get live locations:', error);
      return [];
    }
  }

  subscribeToLiveLocations(rideId: string, callback: (locations: any[]) => void) {
    const channel = supabase
      .channel(`ride_locations_${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_locations',
          filter: `ride_id=eq.${rideId}`,
        },
        async () => {
          const locations = await this.getLiveLocations(rideId);
          callback(locations);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }
}

export const locationTracker = new LocationTracker();

export async function requestLocationPermission(): Promise<boolean> {
  if (!('geolocation' in navigator)) {
    return false;
  }

  if (!('permissions' in navigator)) {
    return true;
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });

    if (result.state === 'granted') {
      return true;
    }

    if (result.state === 'prompt') {
      try {
        await locationTracker.getCurrentLocation();
        return true;
      } catch {
        return false;
      }
    }

    return false;
  } catch (error) {
    return true;
  }
}
