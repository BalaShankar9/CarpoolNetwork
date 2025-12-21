import { useState, useEffect } from 'react';
import { Filter, Save, X, Star, DollarSign, Users, Wifi, Wind, Zap, Package, Baby, Wheelchair, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface SearchFilters {
  maxPrice?: number;
  minRating?: number;
  verifiedOnly: boolean;
  instantBooking: boolean;
  amenities: {
    ac: boolean;
    charging: boolean;
    wifi: boolean;
  };
  preferences: {
    noSmoking: boolean;
    noPets: boolean;
    quietRide: boolean;
  };
  accessibility: {
    childSeat: boolean;
    wheelchair: boolean;
    luggage: boolean;
  };
  friendsOnly: boolean;
  ecoFriendly: boolean;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
}

interface AdvancedSearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  onClose?: () => void;
}

export default function AdvancedSearchFilters({ onFiltersChange, onClose }: AdvancedSearchFiltersProps) {
  const { profile } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    verifiedOnly: false,
    instantBooking: false,
    amenities: {
      ac: false,
      charging: false,
      wifi: false
    },
    preferences: {
      noSmoking: false,
      noPets: false,
      quietRide: false
    },
    accessibility: {
      childSeat: false,
      wheelchair: false,
      luggage: false
    },
    friendsOnly: false,
    ecoFriendly: false
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    loadSavedFilters();
    loadUserPreferences();
  }, [profile?.id]);

  const loadUserPreferences = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error || !data) return;

      const userFilters: SearchFilters = {
        maxPrice: data.search_max_total_price || undefined,
        minRating: data.search_min_driver_rating || undefined,
        verifiedOnly: data.search_require_verified_driver || false,
        instantBooking: data.search_instant_booking_only || false,
        amenities: {
          ac: data.search_require_ac || false,
          charging: data.search_require_charging || false,
          wifi: data.search_require_wifi || false
        },
        preferences: {
          noSmoking: data.search_smoking_filter === 'no-smoking-only',
          noPets: data.search_pets_filter === 'no-pets',
          quietRide: data.search_music_filter === 'quiet-only'
        },
        accessibility: {
          childSeat: data.search_require_child_seat || false,
          wheelchair: data.search_require_wheelchair || false,
          luggage: data.search_luggage_needed === 'large'
        },
        friendsOnly: data.search_friends_only || false,
        ecoFriendly: data.search_eco_friendly_only || false
      };

      setFilters(userFilters);
      onFiltersChange(userFilters);
    } catch (err) {
      console.error('Error loading user preferences:', err);
    }
  };

  const loadSavedFilters = async () => {
    if (!profile?.id) return;

    try {
      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedFilters(data?.map(s => ({
        id: s.id,
        name: s.name,
        filters: s.search_criteria as SearchFilters
      })) || []);
    } catch (err) {
      console.error('Error loading saved filters:', err);
    }
  };

  const saveFilters = async () => {
    if (!filterName.trim() || !profile?.id) return;

    try {
      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: profile.id,
          name: filterName,
          search_criteria: filters
        });

      if (error) throw error;

      setFilterName('');
      setShowSaveDialog(false);
      await loadSavedFilters();
    } catch (err) {
      console.error('Error saving filters:', err);
    }
  };

  const loadSavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
    onFiltersChange(savedFilter.filters);
  };

  const deleteSavedFilter = async (filterId: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', filterId);

      if (error) throw error;
      await loadSavedFilters();
    } catch (err) {
      console.error('Error deleting saved filter:', err);
    }
  };

  const updateFilter = (updates: Partial<SearchFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const emptyFilters: SearchFilters = {
      verifiedOnly: false,
      instantBooking: false,
      amenities: { ac: false, charging: false, wifi: false },
      preferences: { noSmoking: false, noPets: false, quietRide: false },
      accessibility: { childSeat: false, wheelchair: false, luggage: false },
      friendsOnly: false,
      ecoFriendly: false
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const activeFiltersCount = [
    filters.maxPrice !== undefined,
    filters.minRating !== undefined,
    filters.verifiedOnly,
    filters.instantBooking,
    filters.amenities.ac,
    filters.amenities.charging,
    filters.amenities.wifi,
    filters.preferences.noSmoking,
    filters.preferences.noPets,
    filters.preferences.quietRide,
    filters.accessibility.childSeat,
    filters.accessibility.wheelchair,
    filters.accessibility.luggage,
    filters.friendsOnly,
    filters.ecoFriendly
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-6 h-6 text-gray-900" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Advanced Filters</h3>
              <p className="text-sm text-gray-600">
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                Clear All
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {savedFilters.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Saved Filters</p>
            <div className="flex flex-wrap gap-2">
              {savedFilters.map(savedFilter => (
                <div
                  key={savedFilter.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <button
                    onClick={() => loadSavedFilter(savedFilter)}
                    className="text-sm text-blue-700 hover:text-blue-900 font-medium"
                  >
                    {savedFilter.name}
                  </button>
                  <button
                    onClick={() => deleteSavedFilter(savedFilter.id)}
                    className="p-0.5 hover:bg-blue-200 rounded"
                  >
                    <X className="w-3 h-3 text-blue-600" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-gray-600" />
            Price & Rating
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Price (£)
              </label>
              <input
                type="number"
                value={filters.maxPrice || ''}
                onChange={(e) => updateFilter({ maxPrice: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Any"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Star className="w-4 h-4" />
                Min Rating
              </label>
              <select
                value={filters.minRating || ''}
                onChange={(e) => updateFilter({ minRating: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any</option>
                <option value="3">3+ Stars</option>
                <option value="4">4+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Quick Filters</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) => updateFilter({ verifiedOnly: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900">Verified Only</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.instantBooking}
                onChange={(e) => updateFilter({ instantBooking: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-900 flex items-center gap-1">
                <Zap className="w-4 h-4" />
                Instant Booking
              </span>
            </label>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gray-600" />
            Amenities
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.amenities.ac}
                onChange={(e) => updateFilter({ amenities: { ...filters.amenities, ac: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Wind className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">AC</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.amenities.charging}
                onChange={(e) => updateFilter({ amenities: { ...filters.amenities, charging: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Zap className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Charging</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.amenities.wifi}
                onChange={(e) => updateFilter({ amenities: { ...filters.amenities, wifi: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Wifi className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">WiFi</span>
            </label>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Preferences</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.preferences.noSmoking}
                onChange={(e) => updateFilter({ preferences: { ...filters.preferences, noSmoking: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-900">Non-smoking only</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.preferences.noPets}
                onChange={(e) => updateFilter({ preferences: { ...filters.preferences, noPets: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-900">No pets</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.preferences.quietRide}
                onChange={(e) => updateFilter({ preferences: { ...filters.preferences, quietRide: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-900">Quiet ride preferred</span>
            </label>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Accessibility</h4>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.accessibility.childSeat}
                onChange={(e) => updateFilter({ accessibility: { ...filters.accessibility, childSeat: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Baby className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Child Seat</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.accessibility.wheelchair}
                onChange={(e) => updateFilter({ accessibility: { ...filters.accessibility, wheelchair: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Wheelchair className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Wheelchair</span>
            </label>

            <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.accessibility.luggage}
                onChange={(e) => updateFilter({ accessibility: { ...filters.accessibility, luggage: e.target.checked } })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Package className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Luggage</span>
            </label>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Special</h4>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.friendsOnly}
                onChange={(e) => updateFilter({ friendsOnly: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Friends Only</span>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={filters.ecoFriendly}
                onChange={(e) => updateFilter({ ecoFriendly: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-sm font-medium text-gray-900">🌱 Eco-Friendly</span>
            </label>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200">
        {!showSaveDialog ? (
          <button
            onClick={() => setShowSaveDialog(true)}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Save These Filters
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
              placeholder="Filter name..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && saveFilters()}
            />
            <button
              onClick={saveFilters}
              disabled={!filterName.trim()}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setFilterName('');
              }}
              className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
