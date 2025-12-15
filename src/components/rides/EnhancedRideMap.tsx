import { useEffect, useRef, useState, useCallback } from 'react';
import { Navigation, Loader2, RefreshCw, AlertCircle, Zap, Route as RouteIcon, TrendingDown, Leaf } from 'lucide-react';
import { googleMapsService, RouteOption, PlaceDetails, DistanceUnit, formatDistance } from '../../services/googleMapsService';

interface EnhancedRideMapProps {
  origin: { lat: number; lng: number; name: string };
  destination: { lat: number; lng: number; name: string };
  departureTime?: Date;
  onRouteSelect?: (route: RouteOption) => void;
  onGasStationsUpdate?: (stations: PlaceDetails[]) => void;
}

interface RouteVisualization {
  option: RouteOption;
  polyline: google.maps.Polyline;
  isSelected: boolean;
}

export default function EnhancedRideMap({
  origin,
  destination,
  departureTime,
  onRouteSelect,
  onGasStationsUpdate,
}: EnhancedRideMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<RouteVisualization[]>([]);

  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTraffic, setShowTraffic] = useState(true);
  const [gasStations, setGasStations] = useState<PlaceDetails[]>([]);
  const [loadingStations, setLoadingStations] = useState(false);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('mi');
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    initializeMap();
    return () => {
      clearMapElements();
    };
  }, []);

  useEffect(() => {
    if (mapReady && mapInstanceRef.current && origin && destination) {
      loadRoutes();
    }
  }, [mapReady, origin.lat, origin.lng, destination.lat, destination.lng, departureTime]);

  useEffect(() => {
    if (routes.length > 0 && selectedRouteIndex >= 0) {
      updateGasStations();
    }
  }, [selectedRouteIndex, routes]);

  const initializeMap = async () => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        throw new Error('Google Maps API key is not configured');
      }

      if (typeof google === 'undefined' || !google.maps) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
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
        mapTypeControl: true,
        fullscreenControl: true,
        streetViewControl: false,
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

      setMapReady(true);
      setLoading(false);
    } catch (err: any) {
      console.error('Map initialization error:', err);
      setError(err.message || 'Failed to initialize map. Please refresh the page.');
      setLoading(false);
    }
  };

  const clearMapElements = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    polylinesRef.current.forEach(({ polyline }) => polyline.setMap(null));
    polylinesRef.current = [];
  };

  const loadRoutes = async () => {
    if (!mapInstanceRef.current) return;

    setLoading(true);
    setError(null);
    clearMapElements();

    try {
      const routeOptions = await googleMapsService.getMultipleRouteOptions(origin, destination);

      if (routeOptions.length === 0) {
        throw new Error('No routes found');
      }

      setRoutes(routeOptions);
      setSelectedRouteIndex(0);
      renderRoutes(routeOptions, 0);

      addMarkers();
      fitMapBounds();
    } catch (err) {
      console.error('Route loading error:', err);
      setError('Failed to load routes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderRoutes = (routeOptions: RouteOption[], selectedIndex: number) => {
    if (!mapInstanceRef.current || !google?.maps?.geometry?.encoding) return;

    polylinesRef.current.forEach(({ polyline }) => polyline.setMap(null));
    polylinesRef.current = [];

    routeOptions.forEach((route, index) => {
      const isSelected = index === selectedIndex;

      try {
        const decodedPath = google.maps.geometry.encoding.decodePath(route.polyline);

        const polyline = new google.maps.Polyline({
          path: decodedPath,
          geodesic: true,
          strokeColor: isSelected ? '#2563EB' : '#9CA3AF',
          strokeOpacity: isSelected ? 0.9 : 0.5,
          strokeWeight: isSelected ? 6 : 4,
          map: mapInstanceRef.current,
          zIndex: isSelected ? 100 : 50,
        });

        polyline.addListener('click', () => {
          handleRouteSelect(index);
        });

        polylinesRef.current.push({
          option: route,
          polyline,
          isSelected,
        });
      } catch (err) {
        console.error('Error rendering route polyline:', err);
      }
    });
  };

  const addMarkers = () => {
    if (!mapInstanceRef.current) return;

    const originMarker = new google.maps.Marker({
      position: origin,
      map: mapInstanceRef.current,
      title: origin.name,
      label: {
        text: 'A',
        color: 'white',
        fontWeight: 'bold',
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#10B981',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2,
      },
    });

    const destMarker = new google.maps.Marker({
      position: destination,
      map: mapInstanceRef.current,
      title: destination.name,
      label: {
        text: 'B',
        color: 'white',
        fontWeight: 'bold',
      },
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 12,
        fillColor: '#EF4444',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2,
      },
    });

    markersRef.current.push(originMarker, destMarker);
  };

  const fitMapBounds = () => {
    if (!mapInstanceRef.current) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend(origin);
    bounds.extend(destination);
    mapInstanceRef.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  };

  const handleRouteSelect = (index: number) => {
    if (index === selectedRouteIndex || !routes[index]) return;

    setSelectedRouteIndex(index);
    renderRoutes(routes, index);

    if (onRouteSelect) {
      onRouteSelect(routes[index]);
    }
  };

  const updateGasStations = async () => {
    if (!routes[selectedRouteIndex]) return;

    setLoadingStations(true);
    try {
      const selectedRoute = routes[selectedRouteIndex];
      const midLat = (origin.lat + destination.lat) / 2;
      const midLng = (origin.lng + destination.lng) / 2;

      const stations = await googleMapsService.searchNearbyPlaces(
        midLat,
        midLng,
        'gas_station',
        5000
      );

      setGasStations(stations.slice(0, 5));

      if (onGasStationsUpdate) {
        onGasStationsUpdate(stations.slice(0, 5));
      }
    } catch (err) {
      console.error('Error loading gas stations:', err);
    } finally {
      setLoadingStations(false);
    }
  };

  const toggleTraffic = () => {
    if (!trafficLayerRef.current || !mapInstanceRef.current) return;

    const newState = !showTraffic;
    trafficLayerRef.current.setMap(newState ? mapInstanceRef.current : null);
    setShowTraffic(newState);
  };

  const getTrafficBadge = (route: RouteOption, index: number) => {
    if (!departureTime) return null;

    const hour = departureTime.getHours();
    let trafficLevel = 'Light';
    let badgeColor = 'bg-green-100 text-green-700';

    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      trafficLevel = 'Heavy';
      badgeColor = 'bg-red-100 text-red-700';
    } else if ((hour >= 6 && hour < 7) || (hour > 9 && hour < 17) || (hour > 19 && hour < 22)) {
      trafficLevel = 'Moderate';
      badgeColor = 'bg-yellow-100 text-yellow-700';
    }

    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${badgeColor}`}>
        {trafficLevel} Traffic
      </span>
    );
  };

  const getRouteBenefitTags = (route: RouteOption, allRoutes: RouteOption[]) => {
    const tags: string[] = [];

    if (route.optimizationType === 'FASTEST') {
      tags.push('Quickest');
    }
    if (route.optimizationType === 'SHORTEST') {
      tags.push('Shortest Distance');
    }
    if (route.optimizationType === 'ECO_FRIENDLY') {
      tags.push('Fuel Efficient');
    }

    const fastestRoute = allRoutes.reduce((prev, curr) =>
      curr.durationValue < prev.durationValue ? curr : prev
    );

    if (route === fastestRoute && allRoutes.length > 1) {
      const timeSaved = Math.round((allRoutes.reduce((sum, r) => sum + r.durationValue, 0) / allRoutes.length - route.durationValue) / 60);
      if (timeSaved > 0) {
        tags.push(`Saves ${timeSaved} min`);
      }
    }

    return tags;
  };

  const getRecommendedIndex = (routeOptions: RouteOption[]) => {
    if (routeOptions.length === 0) return -1;
    if (routeOptions.length === 1) return 0;

    const scores = routeOptions.map(route => {
      let score = 0;

      score += (1 - route.durationValue / Math.max(...routeOptions.map(r => r.durationValue))) * 45;
      score += (1 - route.distanceValue / Math.max(...routeOptions.map(r => r.distanceValue))) * 10;

      if (route.optimizationType === 'FASTEST') score += 20;
      if (route.optimizationType === 'ECO_FRIENDLY') score += 10;
      if (route.optimizationType === 'BALANCED') score += 15;

      return score;
    });

    return scores.indexOf(Math.max(...scores));
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <p className="text-red-700 font-medium mb-3">{error}</p>
        <button
          onClick={loadRoutes}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const recommendedIndex = getRecommendedIndex(routes);

  const formatRouteDistance = (distanceKm: string) => {
    const km = parseFloat(distanceKm);
    return formatDistance(km, distanceUnit);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <RouteIcon className="w-5 h-5 text-blue-600" />
          Multi-Route Navigation
        </h4>
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setDistanceUnit('mi')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              distanceUnit === 'mi'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            mi
          </button>
          <button
            onClick={() => setDistanceUnit('km')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              distanceUnit === 'km'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            km
          </button>
        </div>
      </div>
      <div className="relative">
        <div ref={mapRef} className="w-full h-[400px] rounded-xl overflow-hidden border border-gray-200" />
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center rounded-xl">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-3" />
            <p className="text-gray-600 font-medium">Loading routes...</p>
          </div>
        )}
        {!loading && mapInstanceRef.current && (
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
          </button>
        )}
      </div>

      {routes.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2">
            {routes.map((route, index) => {
              const isSelected = index === selectedRouteIndex;
              const isRecommended = index === recommendedIndex;
              const benefitTags = getRouteBenefitTags(route, routes);

              return (
                <button
                  key={`${route.name}-${index}`}
                  onClick={() => handleRouteSelect(index)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 bg-white hover:shadow'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h5 className="font-bold text-gray-900">{route.name}</h5>
                        {isRecommended && (
                          <span className="text-xs px-2 py-0.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full font-semibold flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{route.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {route.optimizationType === 'ECO_FRIENDLY' && (
                        <Leaf className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                      {route.optimizationType === 'FASTEST' && (
                        <Zap className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                      {route.optimizationType === 'SHORTEST' && (
                        <TrendingDown className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-2">
                    <span className="text-2xl font-bold text-gray-900">{route.duration}</span>
                    <span className="text-lg text-gray-600">{formatRouteDistance(route.distance.replace(' km', ''))}</span>
                    {getTrafficBadge(route, index)}
                  </div>

                  {benefitTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {benefitTags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-md"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {isRecommended && (
                    <p className="text-xs text-blue-700 mt-2 pt-2 border-t border-blue-200">
                      Recommended because it offers the best balance of speed and efficiency
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
