import { useEffect, useState } from 'react';
import { Cloud, Wind, Droplets, AlertTriangle, Clock, Navigation, Leaf, Sun, Flower2 } from 'lucide-react';
import { googleMapsService, WeatherData, AirQualityData, PollenData, RouteOption } from '../../services/googleMapsService';

interface TripInsightsProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  departureTime?: Date;
  distance?: number;
  duration?: number;
  onRouteSelect?: (route: RouteOption) => void;
}

export default function TripInsights({ origin, destination, departureTime, distance: _distance, duration: _duration, onRouteSelect }: TripInsightsProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [pollenData, setPollenData] = useState<PollenData[]>([]);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);

  const loadInsights = async () => {
    setLoading(true);
    try {
      const [weatherData, airQualityData, pollenInfo, routes] = await Promise.all([
        googleMapsService.getWeatherForecast(destination.lat, destination.lng, departureTime),
        googleMapsService.getAirQuality(destination.lat, destination.lng),
        googleMapsService.getPollenData(destination.lat, destination.lng),
        googleMapsService.getMultipleRouteOptions(origin, destination),
      ]);

      setWeather(weatherData);
      setAirQuality(airQualityData);
      setPollenData(pollenInfo);
      setRouteOptions(routes);
      if (routes.length > 0) {
        setSelectedRoute(routes[0].name);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route.name);
    if (onRouteSelect) {
      onRouteSelect(route);
    }
  };

  const getOptimalDepartureRecommendation = () => {
    if (!departureTime) return null;

    const hour = departureTime.getHours();

    if (hour >= 7 && hour <= 9) {
      return {
        message: 'Rush hour traffic expected. Consider leaving 30 minutes earlier or later.',
        type: 'warning' as const,
      };
    } else if (hour >= 17 && hour <= 19) {
      return {
        message: 'Evening rush hour. Expect delays. Alternative: Leave after 19:30.',
        type: 'warning' as const,
      };
    } else if (hour >= 22 || hour <= 5) {
      return {
        message: 'Quiet roads at this time. Great time for travel!',
        type: 'success' as const,
      };
    }

    return {
      message: 'Good time to travel with moderate traffic.',
      type: 'info' as const,
    };
  };

  const departureRec = getOptimalDepartureRecommendation();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Trip Insights</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Navigation className="w-5 h-5 text-blue-600" />
        Trip Insights & Route Options
      </h3>

      {routeOptions.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Choose Your Route
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {routeOptions.map((route) => (
              <button
                key={route.name}
                onClick={() => handleRouteSelect(route)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedRoute === route.name
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-semibold text-gray-900">{route.name}</h5>
                    <p className="text-sm text-gray-600">{route.description}</p>
                  </div>
                  {route.optimizationType === 'ECO_FRIENDLY' && (
                    <Leaf className="w-5 h-5 text-green-600" />
                  )}
                  {route.optimizationType === 'FASTEST' && (
                    <Clock className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-700">
                    <span className="font-medium">{route.distance}</span>
                  </span>
                  <span className="text-gray-700">
                    <span className="font-medium">{route.duration}</span>
                  </span>
                </div>
                {route.fuelEfficiency && (
                  <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <Leaf className="w-3 h-3" />
                    Fuel efficient route
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {departureRec && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 ${
            departureRec.type === 'warning'
              ? 'bg-amber-50 border border-amber-200'
              : departureRec.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 flex-shrink-0 ${
              departureRec.type === 'warning'
                ? 'text-amber-600'
                : departureRec.type === 'success'
                ? 'text-green-600'
                : 'text-blue-600'
            }`}
          />
          <div>
            <h5 className="font-medium text-gray-900 mb-1">Departure Time Recommendation</h5>
            <p className="text-sm text-gray-700">{departureRec.message}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {weather && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">
                Weather {departureTime ? 'Forecast' : 'Conditions'}
              </h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Temperature</span>
                <span className="font-semibold text-gray-900">{weather.temperature}°C</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Condition</span>
                <span className="font-semibold text-gray-900">{weather.condition}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Droplets className="w-4 h-4" />
                  {weather.humidity}%
                </span>
                <span className="flex items-center gap-1">
                  <Wind className="w-4 h-4" />
                  {weather.windSpeed} km/h
                </span>
              </div>
              {weather.forecast && weather.forecast.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <p className="text-xs font-medium text-gray-700 mb-2">5-Day Forecast</p>
                  <div className="space-y-1">
                    {weather.forecast.slice(0, 3).map((day, idx) => (
                      <div key={idx} className="flex justify-between text-xs text-gray-600">
                        <span>{day.date}</span>
                        <span>{day.temperature}°C - {day.condition}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {airQuality && (
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-gray-900">Air Quality</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">AQI</span>
                <span
                  className="font-bold px-3 py-1 rounded-full text-white text-sm"
                  style={{ backgroundColor: airQuality.color }}
                >
                  {airQuality.aqi}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Category</span>
                <span className="font-semibold text-gray-900">{airQuality.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Main Pollutant</span>
                <span className="font-semibold text-gray-900">{airQuality.dominantPollutant.toUpperCase()}</span>
              </div>
              <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-green-200">
                {airQuality.healthRecommendations}
              </p>
            </div>
          </div>
        )}
      </div>

      {pollenData.length > 0 && (
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Flower2 className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium text-gray-900">Pollen Levels</h4>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {pollenData.map((pollen, idx) => (
              <div key={idx} className="text-center">
                <p className="text-sm font-medium text-gray-900">{pollen.plantType}</p>
                <p className="text-lg font-bold text-purple-600">{pollen.index}</p>
                <p className="text-xs text-gray-600">{pollen.category}</p>
              </div>
            ))}
          </div>
          {pollenData[0] && (
            <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-purple-200">
              {pollenData[0].description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
