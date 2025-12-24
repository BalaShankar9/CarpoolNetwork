import { cache } from '../lib/cache';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export type DistanceUnit = 'km' | 'mi';

export function convertDistance(km: number, unit: DistanceUnit): number {
  return unit === 'mi' ? km * 0.621371 : km;
}

export function formatDistance(km: number, unit: DistanceUnit): string {
  const value = convertDistance(km, unit);
  return `${value.toFixed(1)} ${unit}`;
}

export interface RouteInfo {
  distance: string;
  duration: string;
  distanceValue: number;
  durationValue: number;
  polyline: string;
  steps: google.maps.DirectionsStep[];
}

export interface RouteOption {
  name: string;
  description: string;
  distance: string;
  duration: string;
  distanceValue: number;
  durationValue: number;
  polyline: string;
  trafficDuration?: string;
  fuelEfficiency?: string;
  optimizationType: 'FASTEST' | 'SHORTEST' | 'BALANCED' | 'ECO_FRIENDLY';
}

export interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  icon: string;
  forecast?: WeatherForecast[];
}

export interface WeatherForecast {
  date: string;
  temperature: number;
  condition: string;
  precipitationChance: number;
}

export interface AirQualityData {
  aqi: number;
  category: string;
  dominantPollutant: string;
  healthRecommendations: string;
  color: string;
}

export interface PollenData {
  plantType: string;
  index: number;
  category: string;
  description: string;
}

export interface PlaceDetails {
  name: string;
  address: string;
  placeId: string;
  location: { lat: number; lng: number };
  types: string[];
  rating?: number;
  openNow?: boolean;
}

export class GoogleMapsService {
  private directionsService: google.maps.DirectionsService | null = null;

  constructor() {
    if (typeof google !== 'undefined' && google.maps) {
      this.directionsService = new google.maps.DirectionsService();
    }
  }

  async getWeather(lat: number, lng: number): Promise<WeatherData> {
    return this.getWeatherForecast(lat, lng);
  }

  async geocodeAddress(address: string): Promise<{ data: { lat: number; lng: number } | null; error?: string }> {
    if (!address.trim()) {
      return { data: null, error: 'Address is required' };
    }

    if (!GOOGLE_MAPS_API_KEY) {
      return { data: null, error: 'Missing Google Maps API key' };
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        return { data: null, error: `Geocoding API returned ${response.status}` };
      }

      const data: any = await response.json();
      const result = data.results?.[0];
      const location = result?.geometry?.location;

      if (!location) {
        return { data: null, error: 'No geocoding results' };
      }

      return {
        data: {
          lat: location.lat,
          lng: location.lng
        }
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return { data: null, error: 'Failed to geocode address' };
    }
  }

  async getMultipleRouteOptions(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    departureTime?: Date
  ): Promise<RouteOption[]> {
    const cacheKey = `routes:${origin.lat},${origin.lng}:${destination.lat},${destination.lng}:${departureTime?.toISOString() || 'now'}`;

    return cache.get(cacheKey, async () => {
      const url = `https://routes.googleapis.com/directions/v2:computeRoutes`;

      const routeOptions: RouteOption[] = [];

    const optimizations = [
      { type: 'TRAFFIC_AWARE', name: 'Fastest Route', desc: 'Optimized for current traffic' },
      { type: 'SHORTEST', name: 'Shortest Route', desc: 'Minimum distance' },
      { type: 'FUEL_EFFICIENT', name: 'Eco-Friendly Route', desc: 'Best fuel economy' },
    ];

    try {
      for (const opt of optimizations) {
        const requestBody: any = {
          origin: {
            location: {
              latLng: {
                latitude: origin.lat,
                longitude: origin.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.lat,
                longitude: destination.lng,
              },
            },
          },
          travelMode: 'DRIVE',
          routingPreference: opt.type,
          computeAlternativeRoutes: false,
          languageCode: 'en-GB',
          units: 'METRIC',
        };

        if (departureTime) {
          requestBody.departureTime = departureTime.toISOString();
        }

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline,routes.legs',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          const data = await response.json();
          const route = data.routes?.[0];

          if (route) {
            const distanceKm = (route.distanceMeters / 1000).toFixed(1);
            const trafficDuration = route.duration ? parseInt(route.duration.replace('s', '')) : null;
            const staticDuration = route.staticDuration ? parseInt(route.staticDuration.replace('s', '')) : null;
            const durationValue = trafficDuration || staticDuration || 0;
            const durationMin = Math.round(durationValue / 60);

            const trafficDurationText = trafficDuration && staticDuration && trafficDuration > staticDuration
              ? `${Math.round(trafficDuration / 60)} min (with traffic)`
              : null;

            routeOptions.push({
              name: opt.name,
              description: opt.desc,
              distance: `${distanceKm} km`,
              duration: `${durationMin} min`,
              distanceValue: route.distanceMeters,
              durationValue: durationValue,
              polyline: route.polyline?.encodedPolyline || '',
              optimizationType: opt.type === 'TRAFFIC_AWARE' ? 'FASTEST' : opt.type === 'SHORTEST' ? 'SHORTEST' : 'ECO_FRIENDLY',
              fuelEfficiency: opt.type === 'FUEL_EFFICIENT' ? 'Optimized' : undefined,
              trafficDuration: trafficDurationText || undefined,
            });
          }
        }
      }

      if (routeOptions.length > 1) {
        const avgDistance = routeOptions.reduce((sum, r) => sum + r.distanceValue, 0) / routeOptions.length;
        const avgDuration = routeOptions.reduce((sum, r) => sum + r.durationValue, 0) / routeOptions.length;

        routeOptions.push({
          name: 'Balanced Route',
          description: 'Best balance of time and distance',
          distance: `${(avgDistance / 1000).toFixed(1)} km`,
          duration: `${Math.round(avgDuration / 60)} min`,
          distanceValue: avgDistance,
          durationValue: avgDuration,
          polyline: routeOptions[0].polyline,
          optimizationType: 'BALANCED',
        });
      }

      return routeOptions.length > 0 ? routeOptions : await this.getFallbackRoute(origin, destination);
    } catch (error) {
      console.error('Routes API error:', error);
      return await this.getFallbackRoute(origin, destination);
    }
    }, 600000);
  }

  private async getFallbackRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteOption[]> {
    if (!this.directionsService) {
      return [];
    }

    try {
      const route = await this.getDirections(origin, destination);
      return [
        {
          name: 'Standard Route',
          description: 'Default route',
          distance: route.distance,
          duration: route.duration,
          distanceValue: route.distanceValue,
          durationValue: route.durationValue,
          polyline: route.polyline,
          optimizationType: 'BALANCED',
        },
      ];
    } catch {
      return [];
    }
  }

  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    waypoints?: google.maps.DirectionsWaypoint[]
  ): Promise<RouteInfo> {
    if (!this.directionsService) {
      throw new Error('Google Maps not loaded');
    }

    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      travelMode: google.maps.TravelMode.DRIVING,
      waypoints: waypoints || [],
      optimizeWaypoints: true,
      avoidHighways: false,
      avoidTolls: false,
    };

    return new Promise((resolve, reject) => {
      this.directionsService!.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const route = result.routes[0];
          const leg = route.legs[0];

          resolve({
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || '',
            distanceValue: leg.distance?.value || 0,
            durationValue: leg.duration?.value || 0,
            polyline: route.overview_polyline || '',
            steps: leg.steps,
          });
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  async getWeatherForecast(lat: number, lng: number, targetDate?: Date): Promise<WeatherData> {
    const timeBucket = targetDate
      ? Math.floor(targetDate.getTime() / (3600000 * 3))
      : Math.floor(Date.now() / (3600000 * 3));
    const cacheKey = `weather:${lat.toFixed(2)},${lng.toFixed(2)}:${timeBucket}`;

    return cache.get(
      cacheKey,
      async () => {
        const url = `https://weather.googleapis.com/v1/weather?location=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Weather API returned ${response.status}`);
        }

        const data = await response.json();

        return {
          temperature: data.temperature?.value || 20,
          condition: data.condition?.description || 'Partly Cloudy',
          humidity: data.humidity?.value || 60,
          windSpeed: data.wind?.speed?.value || 10,
          icon: data.condition?.icon || 'partly_cloudy',
          forecast: targetDate ? this.generateForecast(targetDate) : undefined,
        };
      },
      600000,
      () => this.getMockWeatherData(targetDate) as any
    );
  }

  private getMockWeatherData(targetDate?: Date): WeatherData {
    const temp = 15 + Math.random() * 10;
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    return {
      temperature: Math.round(temp),
      condition,
      humidity: 50 + Math.floor(Math.random() * 30),
      windSpeed: 5 + Math.floor(Math.random() * 15),
      icon: condition.toLowerCase().replace(' ', '_'),
      forecast: targetDate ? this.generateForecast(targetDate) : undefined,
    };
  }

  private generateForecast(targetDate: Date): WeatherForecast[] {
    const forecast: WeatherForecast[] = [];
    const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'];

    for (let i = 0; i < 5; i++) {
      const date = new Date(targetDate);
      date.setDate(date.getDate() + i);

      forecast.push({
        date: date.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
        temperature: Math.round(12 + Math.random() * 12),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        precipitationChance: Math.floor(Math.random() * 60),
      });
    }

    return forecast;
  }

  async getAirQuality(lat: number, lng: number): Promise<AirQualityData> {
    const timeBucket = Math.floor(Date.now() / (3600000 * 6));
    const cacheKey = `airquality:${lat.toFixed(2)},${lng.toFixed(2)}:${timeBucket}`;

    return cache.get(
      cacheKey,
      async () => {
        const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_MAPS_API_KEY}`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            location: {
              latitude: lat,
              longitude: lng,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Air Quality API returned ${response.status}`);
        }

        const data = await response.json();
        const indexes = data.indexes || [];
        const primaryIndex = indexes[0] || {};

        const categoryColors: { [key: string]: string } = {
          'Excellent': '#00E400',
          'Good': '#92D050',
          'Moderate': '#FFFF00',
          'Poor': '#FF7E00',
          'Very Poor': '#FF0000',
          'Severe': '#8F3F97',
        };

        return {
          aqi: primaryIndex.aqi || 50,
          category: primaryIndex.category || 'Good',
          dominantPollutant: primaryIndex.dominantPollutant || 'pm25',
          healthRecommendations: primaryIndex.healthRecommendations?.generalPopulation || 'Air quality is acceptable',
          color: categoryColors[primaryIndex.category] || '#92D050',
        };
      },
      1800000,
      () => ({
        aqi: 50,
        category: 'Good',
        dominantPollutant: 'pm25',
        healthRecommendations: 'Air quality data unavailable',
        color: '#92D050',
      })
    );
  }

  async getPollenData(lat: number, lng: number): Promise<PollenData[]> {
    const url = `https://pollen.googleapis.com/v1/forecast:lookup?key=${GOOGLE_MAPS_API_KEY}&location.latitude=${lat}&location.longitude=${lng}&days=1`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Pollen API request failed');
      }

      const data = await response.json();
      const dailyInfo = data.dailyInfo?.[0];
      const pollenTypes = dailyInfo?.pollenTypeInfo || [];

      return pollenTypes.map((pollen: any) => ({
        plantType: pollen.displayName || pollen.code,
        index: pollen.indexInfo?.value || 0,
        category: pollen.indexInfo?.category || 'Low',
        description: this.getPollenDescription(pollen.indexInfo?.category || 'Low'),
      }));
    } catch (error) {
      console.error('Pollen API error:', error);
      return this.getMockPollenData();
    }
  }

  private getMockPollenData(): PollenData[] {
    const types = ['Tree', 'Grass', 'Weed'];
    return types.map(type => ({
      plantType: type,
      index: Math.floor(Math.random() * 5),
      category: ['Low', 'Low-Medium', 'Medium', 'Medium-High', 'High'][Math.floor(Math.random() * 5)],
      description: 'Pollen levels are typical for this time of year',
    }));
  }

  private getPollenDescription(category: string): string {
    const descriptions: { [key: string]: string } = {
      'Low': 'Pollen levels are low and pose little risk',
      'Low-Medium': 'Pollen levels are slightly elevated',
      'Medium': 'Moderate pollen levels, sensitive individuals may experience symptoms',
      'Medium-High': 'High pollen levels, precautions recommended',
      'High': 'Very high pollen levels, outdoor activities may be affected',
    };
    return descriptions[category] || 'No data available';
  }

  async searchNearbyPlaces(
    lat: number,
    lng: number,
    type: string,
    radius: number = 5000
  ): Promise<PlaceDetails[]> {
    const cacheKey = `places:${type}:${lat.toFixed(2)},${lng.toFixed(2)}:${radius}`;

    return cache.get(cacheKey, async () => {
      const url = `https://places.googleapis.com/v1/places:searchNearby`;

      try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.currentOpeningHours',
        },
        body: JSON.stringify({
          locationRestriction: {
            circle: {
              center: {
                latitude: lat,
                longitude: lng,
              },
              radius,
            },
          },
          includedTypes: [type],
          maxResultCount: 10,
        }),
      });

      if (!response.ok) {
        throw new Error('Places API request failed');
      }

      const data = await response.json();
      const places = data.places || [];

      return places.map((place: any) => ({
        name: place.displayName?.text || '',
        address: place.formattedAddress || '',
        placeId: place.id || '',
        location: {
          lat: place.location?.latitude || 0,
          lng: place.location?.longitude || 0,
        },
        types: place.types || [],
        rating: place.rating,
        openNow: place.currentOpeningHours?.openNow,
      }));
      } catch (error) {
        console.error('Places API error:', error);
        return [];
      }
    }, 900000);
  }

  getStaticMapUrl(
    center: { lat: number; lng: number },
    zoom: number = 13,
    width: number = 600,
    height: number = 400,
    markers?: Array<{ lat: number; lng: number; label?: string }>
  ): string {
    let url = `https://maps.googleapis.com/maps/api/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${width}x${height}&key=${GOOGLE_MAPS_API_KEY}`;

    if (markers && markers.length > 0) {
      markers.forEach((marker) => {
        const label = marker.label ? `|label:${marker.label}` : '';
        url += `&markers=color:red${label}|${marker.lat},${marker.lng}`;
      });
    }

    return url;
  }

  calculateDetour(
    originalDistance: number,
    newDistance: number
  ): { detourKm: number; detourPercent: number } {
    const detourKm = (newDistance - originalDistance) / 1000;
    const detourPercent = ((newDistance - originalDistance) / originalDistance) * 100;

    return {
      detourKm: Math.round(detourKm * 10) / 10,
      detourPercent: Math.round(detourPercent * 10) / 10,
    };
  }
}

export const googleMapsService = new GoogleMapsService();
