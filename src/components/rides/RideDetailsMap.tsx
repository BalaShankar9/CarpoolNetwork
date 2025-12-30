import { useEffect, useRef, useState } from 'react';
import { Cloud, Wind, Droplets, AlertTriangle, Navigation } from 'lucide-react';
import { googleMapsService, WeatherData, AirQualityData } from '../../services/googleMapsService';
import { getRuntimeConfig } from '../../lib/runtimeConfig';

declare global {
  interface Window {
    initMap?: () => void;
  }
}

interface RideDetailsMapProps {
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  waypoints?: Array<{ lat: number; lng: number; name: string }>;
  showWeather?: boolean;
  showAirQuality?: boolean;
}

export default function RideDetailsMap({
  origin,
  destination,
  waypoints = [],
  showWeather = true,
  showAirQuality = true,
}: RideDetailsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTraffic, setShowTraffic] = useState(true);

  useEffect(() => {
    initializeMap();
  }, [origin, destination, waypoints]);

  const initializeMap = async () => {
    if (!mapRef.current) return;

    try {
      setError(null);
      const { mapsApiKey } = await getRuntimeConfig();
      if (!mapsApiKey) {
        throw new Error('Google Maps API key is not configured');
      }

      if (typeof google === 'undefined' || !google.maps) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}&libraries=places,geometry`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = () => reject(new Error('Failed to load Google Maps'));
          setTimeout(() => reject(new Error('Google Maps loading timeout')), 15000);
        });

        // Wait for geometry library to be fully initialized
        let retries = 0;
        while ((!google?.maps?.geometry?.encoding) && retries < 30) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
      }

      const map = new google.maps.Map(mapRef.current, {
        zoom: 10,
        center: origin,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      });

      mapInstanceRef.current = map;

      const trafficLayer = new google.maps.TrafficLayer();
      trafficLayer.setMap(map);
      trafficLayerRef.current = trafficLayer;

      new google.maps.Marker({
        position: origin,
        map,
        title: origin.name,
        label: 'A',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        },
      });

      new google.maps.Marker({
        position: destination,
        map,
        title: destination.name,
        label: 'B',
        icon: {
          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
        },
      });

      waypoints.forEach((wp, index) => {
        new google.maps.Marker({
          position: wp,
          map,
          title: wp.name,
          label: String.fromCharCode(67 + index),
        });
      });

      const route = await googleMapsService.getDirections(
        origin,
        destination,
        waypoints.map(wp => ({
          location: new google.maps.LatLng(wp.lat, wp.lng),
          stopover: true,
        }))
      );

      setRouteInfo({
        distance: route.distance,
        duration: route.duration,
      });

      new google.maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 5,
        map,
      });

      const bounds = new google.maps.LatLngBounds();
      bounds.extend(origin);
      bounds.extend(destination);
      waypoints.forEach(wp => bounds.extend(wp));
      map.fitBounds(bounds);

      if (showWeather) {
        const weatherData = await googleMapsService.getWeather(origin.lat, origin.lng);
        setWeather(weatherData);
      }

      if (showAirQuality) {
        const aqData = await googleMapsService.getAirQuality(origin.lat, origin.lng);
        setAirQuality(aqData);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error initializing map:', error);
      setError(error instanceof Error ? error.message : 'Failed to load map');
      setLoading(false);
    }
  };

  const getAQIColor = (aqi: number) => {
    if (aqi <= 50) return 'text-green-600 bg-green-50';
    if (aqi <= 100) return 'text-yellow-600 bg-yellow-50';
    if (aqi <= 150) return 'text-orange-600 bg-orange-50';
    if (aqi <= 200) return 'text-red-600 bg-red-50';
    return 'text-purple-600 bg-purple-50';
  };

  const getAQILabel = (aqi: number) => {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive';
    if (aqi <= 200) return 'Unhealthy';
    return 'Very Unhealthy';
  };

  useEffect(() => {
    if (trafficLayerRef.current && mapInstanceRef.current) {
      trafficLayerRef.current.setMap(showTraffic ? mapInstanceRef.current : null);
    }
  }, [showTraffic]);

  const toggleTraffic = () => {
    setShowTraffic(!showTraffic);
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <div ref={mapRef} className="w-full h-96 rounded-xl overflow-hidden" />
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        )}
        {!loading && (
          <button
            onClick={toggleTraffic}
            className={`absolute top-4 right-4 px-3 py-2 rounded-lg shadow-lg font-medium flex items-center gap-2 transition-colors text-sm z-10 ${
              showTraffic
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span className="hidden sm:inline">{showTraffic ? 'Hide Traffic' : 'Show Traffic'}</span>
            <span className="sm:hidden">{showTraffic ? 'Hide' : 'Show'}</span>
          </button>
        )}
      </div>

      {routeInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Distance</p>
              <p className="text-2xl font-bold text-blue-900">{routeInfo.distance}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-700 font-medium">Duration</p>
              <p className="text-2xl font-bold text-blue-900">{routeInfo.duration}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {showWeather && weather && weather.condition !== 'Unavailable' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Weather at Origin</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Temperature</span>
                <span className="font-semibold">{weather.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Condition</span>
                <span className="font-semibold">{weather.condition}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Droplets className="w-4 h-4 text-blue-500" />
                  <span className="text-sm">{weather.humidity}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">{weather.windSpeed} km/h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAirQuality && airQuality && airQuality.category !== 'Unavailable' && (
          <div className={`border rounded-xl p-4 ${getAQIColor(airQuality.aqi)}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Air Quality</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>AQI</span>
                <span className="font-bold text-2xl">{airQuality.aqi}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status</span>
                <span className="font-semibold">{getAQILabel(airQuality.aqi)}</span>
              </div>
              {airQuality.dominantPollutant !== 'Unknown' && (
                <div className="text-sm">
                  <span className="font-medium">Pollutant:</span> {airQuality.dominantPollutant}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
