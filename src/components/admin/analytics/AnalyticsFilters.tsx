/**
 * Analytics Filter Bar
 *
 * Global filters for the admin analytics dashboard.
 * Includes date range, community, ride type, and segment selectors.
 */

import { useState, useCallback } from 'react';
import { Calendar, Filter, ChevronDown, X } from 'lucide-react';
import type { AnalyticsFilters, DateRangePreset } from '../../../types/analytics';
import { RIDE_TYPE_LIST } from '../../../types/rideTypes';

interface AnalyticsFiltersProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  isLoading?: boolean;
}

const DATE_PRESETS: { label: string; value: DateRangePreset; days: number }[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'Custom', value: 'custom', days: 0 },
];

const SEGMENTS = [
  { label: 'All Users', value: 'all' },
  { label: 'Drivers', value: 'drivers' },
  { label: 'Passengers', value: 'passengers' },
] as const;

export default function AnalyticsFilterBar({
  filters,
  onFiltersChange,
  isLoading = false,
}: AnalyticsFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('30d');

  const handlePresetChange = useCallback((preset: DateRangePreset) => {
    setSelectedPreset(preset);

    if (preset === 'custom') return;

    const presetConfig = DATE_PRESETS.find(p => p.value === preset);
    if (!presetConfig) return;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - presetConfig.days);

    onFiltersChange({
      ...filters,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    });
  }, [filters, onFiltersChange]);

  const handleDateChange = useCallback((field: 'startDate' | 'endDate', value: string) => {
    setSelectedPreset('custom');
    onFiltersChange({
      ...filters,
      [field]: value,
    });
  }, [filters, onFiltersChange]);

  const handleSegmentChange = useCallback((segment: 'all' | 'drivers' | 'passengers') => {
    onFiltersChange({
      ...filters,
      segment,
    });
  }, [filters, onFiltersChange]);

  const handleRideTypeChange = useCallback((rideType: string) => {
    onFiltersChange({
      ...filters,
      rideType: rideType === 'all' ? undefined : rideType,
    });
  }, [filters, onFiltersChange]);

  const clearFilters = useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    setSelectedPreset('30d');
    onFiltersChange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      segment: 'all',
      rideType: undefined,
      communityId: undefined,
    });
  }, [onFiltersChange]);

  const hasActiveFilters = filters.segment !== 'all' || filters.rideType || filters.communityId;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range Presets */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {DATE_PRESETS.slice(0, 3).map((preset) => (
              <button
                key={preset.value}
                onClick={() => handlePresetChange(preset.value)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  selectedPreset === preset.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        {selectedPreset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Custom Date Toggle */}
        {selectedPreset !== 'custom' && (
          <button
            onClick={() => setSelectedPreset('custom')}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Custom dates
          </button>
        )}

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`ml-auto flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            hasActiveFilters
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {[filters.segment !== 'all', filters.rideType, filters.communityId].filter(Boolean).length}
            </span>
          )}
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            title="Clear all filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Segment Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">User Segment</label>
            <select
              value={filters.segment || 'all'}
              onChange={(e) => handleSegmentChange(e.target.value as 'all' | 'drivers' | 'passengers')}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {SEGMENTS.map((seg) => (
                <option key={seg.value} value={seg.value}>
                  {seg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ride Type Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Ride Type</label>
            <select
              value={filters.rideType || 'all'}
              onChange={(e) => handleRideTypeChange(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {RIDE_TYPE_LIST.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Placeholder for Community Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Community</label>
            <select
              value={filters.communityId || 'all'}
              disabled={true} // Placeholder - enable when multi-community is implemented
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-400"
            >
              <option value="all">All Communities</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}
