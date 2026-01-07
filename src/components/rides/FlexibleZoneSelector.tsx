import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Target, ChevronDown, Check } from 'lucide-react';
import { multiStopRouteService, FlexiblePickupZone } from '@/services/multiStopRouteService';

interface FlexibleZoneSelectorProps {
  centerLat: number;
  centerLng: number;
  initialRadius?: number;
  onRadiusChange: (radius: number) => void;
  onLocationSelect: (location: { lat: number; lng: number; address: string }) => void;
  selectedLocation?: { lat: number; lng: number };
}

export function FlexibleZoneSelector({
  centerLat,
  centerLng,
  initialRadius = 300,
  onRadiusChange,
  onLocationSelect,
  selectedLocation
}: FlexibleZoneSelectorProps) {
  const [radius, setRadius] = useState(initialRadius);
  const [zone, setZone] = useState<FlexiblePickupZone | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const generatedZone = multiStopRouteService.generateFlexibleZone(
      centerLat,
      centerLng,
      radius
    );
    setZone(generatedZone);
  }, [centerLat, centerLng, radius]);

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    onRadiusChange(newRadius);
  };

  const radiusOptions = [
    { value: 100, label: '100m', description: '~1 min walk' },
    { value: 200, label: '200m', description: '~2 min walk' },
    { value: 300, label: '300m', description: '~4 min walk' },
    { value: 500, label: '500m', description: '~6 min walk' },
    { value: 1000, label: '1km', description: '~12 min walk' }
  ];

  const isLocationSelected = (loc: { lat: number; lng: number }) => {
    if (!selectedLocation) return false;
    return Math.abs(loc.lat - selectedLocation.lat) < 0.0001 && 
           Math.abs(loc.lng - selectedLocation.lng) < 0.0001;
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Flexible Pickup Zone</h3>
            <p className="text-sm text-slate-400">
              Within {radius}m • ~{Math.round(radius / 80)} min walking distance
            </p>
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="border-t border-slate-700/50"
        >
          <div className="p-4 space-y-4">
            {/* Radius Selection */}
            <div>
              <label className="text-sm text-slate-400 block mb-2">Pickup Radius</label>
              <div className="flex flex-wrap gap-2">
                {radiusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleRadiusChange(option.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      radius === option.value
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs opacity-70">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Suggested Pickup Points */}
            {zone && (
              <div>
                <label className="text-sm text-slate-400 block mb-2">
                  Suggested Pickup Points
                </label>
                <div className="space-y-2">
                  {/* Center Point */}
                  <button
                    onClick={() => onLocationSelect({
                      lat: centerLat,
                      lng: centerLng,
                      address: 'Original Location'
                    })}
                    className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                      isLocationSelected({ lat: centerLat, lng: centerLng })
                        ? 'bg-purple-500/20 border-2 border-purple-500'
                        : 'bg-slate-700/50 hover:bg-slate-700'
                    }`}
                  >
                    <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center">
                      <Navigation className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium text-white">Original Location</div>
                      <div className="text-xs text-slate-400">Exact pickup point</div>
                    </div>
                    {isLocationSelected({ lat: centerLat, lng: centerLng }) && (
                      <Check className="w-5 h-5 text-purple-400" />
                    )}
                  </button>

                  {/* Generated Points */}
                  {zone.suggestedLocations.map((loc, index) => (
                    <button
                      key={index}
                      onClick={() => onLocationSelect({
                        lat: loc.lat,
                        lng: loc.lng,
                        address: loc.location
                      })}
                      className={`w-full p-3 rounded-xl flex items-center gap-3 transition-all ${
                        isLocationSelected(loc)
                          ? 'bg-purple-500/20 border-2 border-purple-500'
                          : 'bg-slate-700/50 hover:bg-slate-700'
                      }`}
                    >
                      <div className="w-8 h-8 bg-blue-500/30 rounded-lg flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-white">{loc.location}</div>
                        <div className="text-xs text-slate-400">~{loc.walkingTime} min walk</div>
                      </div>
                      {isLocationSelected(loc) && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
              <p className="text-xs text-blue-300">
                💡 Flexible pickup zones help drivers optimize their route. 
                Choose any point within the zone that's convenient for both you and the driver.
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default FlexibleZoneSelector;
