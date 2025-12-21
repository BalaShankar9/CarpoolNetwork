import React, { useState, useEffect } from 'react';
import {
  Filter, Star, DollarSign, Clock, Shield, Wind, Music,
  Users, Heart, Save, X, ChevronDown, ChevronUp, Sparkles, TrendingUp
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { PreferenceMatchingService, type SearchFilterSettings } from '../../services/preferenceMatching';

interface PassengerFilterCenterProps {
  onFiltersChange: (filters: SearchFilterSettings) => void;
  onSearch: () => void;
  matchCount?: number;
}

export default function PassengerFilterCenter({
  onFiltersChange,
  onSearch,
  matchCount = 0
}: PassengerFilterCenterProps) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilterSettings>({});
  const [savedFilters, setSavedFilters] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['quick']));
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    loadSavedFilters();
    loadRecommendations();
  }, [user]);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters]);

  const loadSavedFilters = async () => {
    if (!user) return;
    const filters = await PreferenceMatchingService.getSavedFilters(user.id);
    setSavedFilters(filters);
  };

  const loadRecommendations = async () => {
    const recs = PreferenceMatchingService.getRecommendedFilterAdjustments(filters, matchCount);
    setRecommendations(recs);
  };

  const updateFilter = (key: keyof SearchFilterSettings, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const saveCurrentFilters = async () => {
    if (!user || !filterName) return;

    await PreferenceMatchingService.saveSearchFilter(user.id, filterName, filters);
    setShowSaveDialog(false);
    setFilterName('');
    loadSavedFilters();
  };

  const loadFilter = (savedFilter: any) => {
    setFilters(savedFilter.filter_settings);
    PreferenceMatchingService.updateFilterUsage(savedFilter.id);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const applyPreset = (preset: string) => {
    switch (preset) {
      case 'cheapest':
        setFilters({
          priorityAlgorithm: 'cheapest',
          minRating: 3.0,
          carpoolingOk: true
        });
        break;
      case 'fastest':
        setFilters({
          priorityAlgorithm: 'fastest',
          minRating: 4.0,
          instantBookingOnly: true
        });
        break;
      case 'safest':
        setFilters({
          priorityAlgorithm: 'highest-rated',
          minRating: 4.8,
          requireVerified: true
        });
        break;
      case 'comfort':
        setFilters({
          priorityAlgorithm: 'comfort',
          minRating: 4.5,
          requireAC: true,
          requireCharging: true,
          musicFilter: 'quiet-only'
        });
        break;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Find Your Perfect Ride</h2>
            <p className="text-sm text-gray-600 mt-1">
              {matchCount} rides match your preferences
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Filters
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <FilterSection
          title="Quick Filters"
          icon={Sparkles}
          expanded={expandedSections.has('quick')}
          onToggle={() => toggleSection('quick')}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <PresetButton
              label="Cheapest"
              icon={DollarSign}
              onClick={() => applyPreset('cheapest')}
              active={filters.priorityAlgorithm === 'cheapest'}
            />
            <PresetButton
              label="Fastest"
              icon={Clock}
              onClick={() => applyPreset('fastest')}
              active={filters.priorityAlgorithm === 'fastest'}
            />
            <PresetButton
              label="Safest"
              icon={Shield}
              onClick={() => applyPreset('safest')}
              active={filters.priorityAlgorithm === 'highest-rated'}
            />
            <PresetButton
              label="Most Comfortable"
              icon={Star}
              onClick={() => applyPreset('comfort')}
              active={filters.priorityAlgorithm === 'comfort'}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Price
              </label>
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => updateFilter('maxPrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="No limit"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Rating
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={filters.minRating || 0}
                  onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-semibold text-gray-900 w-12 text-center">
                  {(filters.minRating || 0).toFixed(1)} <Star className="w-3 h-3 inline text-yellow-500" />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.requireVerified || false}
                  onChange={(e) => updateFilter('requireVerified', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Verified only</span>
              </label>
            </div>
          </div>
        </FilterSection>

        {savedFilters.length > 0 && (
          <FilterSection
            title="Saved Filters"
            icon={Heart}
            expanded={expandedSections.has('saved')}
            onToggle={() => toggleSection('saved')}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {savedFilters.slice(0, 6).map((saved) => (
                <button
                  key={saved.id}
                  onClick={() => loadFilter(saved)}
                  className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{saved.filter_name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Used {saved.use_count} times
                  </div>
                </button>
              ))}
            </div>
          </FilterSection>
        )}

        <FilterSection
          title="Driver Requirements"
          icon={Users}
          expanded={expandedSections.has('driver')}
          onToggle={() => toggleSection('driver')}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filters.requireVerified || false}
                  onChange={(e) => updateFilter('requireVerified', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Verified drivers</span>
              </label>

              <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filters.instantBookingOnly || false}
                  onChange={(e) => updateFilter('instantBookingOnly', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Instant booking</span>
              </label>

              <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filters.friendsOnly || false}
                  onChange={(e) => updateFilter('friendsOnly', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Friends only</span>
              </label>
            </div>
          </div>
        </FilterSection>

        <FilterSection
          title="Ride Experience"
          icon={Star}
          expanded={expandedSections.has('experience')}
          onToggle={() => toggleSection('experience')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Smoking Preference
              </label>
              <select
                value={filters.smokingFilter || 'any'}
                onChange={(e) => updateFilter('smokingFilter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="any">Any</option>
                <option value="no-smoking-only">No smoking only</option>
                <option value="outside-only-ok">Outside breaks OK</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Music Preference
              </label>
              <select
                value={filters.musicFilter || 'any'}
                onChange={(e) => updateFilter('musicFilter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="any">Any</option>
                <option value="quiet-only">Quiet only</option>
                <option value="moderate-max">Moderate max</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pets Policy
              </label>
              <select
                value={filters.petsFilter || 'any'}
                onChange={(e) => updateFilter('petsFilter', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="any">Any</option>
                <option value="no-pets">No pets</option>
                <option value="pets-ok-only">Pets OK only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
            <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filters.requireAC || false}
                onChange={(e) => updateFilter('requireAC', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <Wind className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">A/C Required</span>
            </label>

            <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filters.requireCharging || false}
                onChange={(e) => updateFilter('requireCharging', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Phone Charging</span>
            </label>

            <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={filters.requireWiFi || false}
                onChange={(e) => updateFilter('requireWiFi', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">WiFi</span>
            </label>
          </div>
        </FilterSection>

        {recommendations.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Smart Suggestions</h3>
                <ul className="space-y-2">
                  {recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm">
                      <span className="text-gray-700">{rec.suggestion}</span>
                      <span className="text-blue-600 ml-2">→ {rec.impact}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={onSearch}
          className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
        >
          <Filter className="w-5 h-5" />
          Search with Filters ({matchCount} matches)
        </button>
      </div>

      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Filter Profile</h3>
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="e.g., Daily Commute, Weekend Trips..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCurrentFilters}
                disabled={!filterName}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSection({ title, icon: Icon, expanded, onToggle, children }: any) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-gray-600" /> : <ChevronDown className="w-5 h-5 text-gray-600" />}
      </button>
      {expanded && (
        <div className="p-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
  );
}

function PresetButton({ label, icon: Icon, onClick, active }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
        active
          ? 'border-blue-600 bg-blue-50 text-blue-600'
          : 'border-gray-200 hover:border-gray-300 text-gray-700'
      }`}
    >
      <Icon className="w-6 h-6" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
