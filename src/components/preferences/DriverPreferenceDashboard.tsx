import React, { useState, useEffect } from 'react';
import {
  Car, Shield, Users, DollarSign, Calendar, Settings,
  Music, Thermometer, MessageCircle, Cigarette, Dog, Baby,
  Wifi, Battery, Wind, Package, Accessibility, Star,
  CheckCircle, XCircle, AlertCircle, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';

type UserPreferences = Database['public']['Tables']['user_preferences']['Row'];

interface DriverPreferenceDashboardProps {
  onClose?: () => void;
}

export default function DriverPreferenceDashboard({ onClose }: DriverPreferenceDashboardProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('vehicle');
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setPreferences(data);
    }
    setLoading(false);
  };

  const savePreferences = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'vehicle', label: 'Vehicle & Comfort', icon: Car },
    { id: 'policies', label: 'Ride Policies', icon: Shield },
    { id: 'screening', label: 'Passenger Requirements', icon: Users },
    { id: 'safety', label: 'Safety & Communication', icon: Shield },
    { id: 'pricing', label: 'Pricing & Payments', icon: DollarSign },
    { id: 'templates', label: 'Recurring & Templates', icon: Calendar }
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Driver Preferences</h1>
            <div className="flex gap-3">
              {saved && (
                <span className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Saved successfully
                </span>
              )}
              <button
                onClick={savePreferences}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="flex overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'vehicle' && (
            <VehicleComfortTab preferences={preferences} updatePreference={updatePreference} />
          )}
          {activeTab === 'policies' && (
            <RidePoliciesTab preferences={preferences} updatePreference={updatePreference} />
          )}
          {activeTab === 'screening' && (
            <PassengerScreeningTab preferences={preferences} updatePreference={updatePreference} />
          )}
          {activeTab === 'safety' && (
            <SafetyCommunicationTab preferences={preferences} updatePreference={updatePreference} />
          )}
          {activeTab === 'pricing' && (
            <PricingPaymentsTab preferences={preferences} updatePreference={updatePreference} />
          )}
          {activeTab === 'templates' && (
            <TemplatesTab />
          )}
        </div>
      </div>
    </div>
  );
}

function VehicleComfortTab({ preferences, updatePreference }: any) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-blue-600" />
          Entertainment & Atmosphere
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Music Preference
            </label>
            <select
              value={preferences.music_preference || 'moderate'}
              onChange={(e) => updatePreference('music_preference', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No music</option>
              <option value="quiet">Quiet background music</option>
              <option value="moderate">Moderate volume</option>
              <option value="loud">Loud music</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Music Genres (multiple)
            </label>
            <input
              type="text"
              placeholder="Pop, Rock, Jazz, Classical..."
              value={preferences.music_genres_preferred?.join(', ') || ''}
              onChange={(e) => updatePreference('music_genres_preferred', e.target.value.split(',').map((s: string) => s.trim()))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conversation Level
            </label>
            <select
              value={preferences.conversation_level || 'moderate'}
              onChange={(e) => updatePreference('conversation_level', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="quiet">Quiet - Minimal conversation</option>
              <option value="moderate">Moderate - Friendly chat</option>
              <option value="chatty">Chatty - Love to talk</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature Preference
            </label>
            <select
              value={preferences.temperature_preference || 'moderate'}
              onChange={(e) => updatePreference('temperature_preference', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="cold">Cold (16-18°C)</option>
              <option value="cool">Cool (19-21°C)</option>
              <option value="moderate">Moderate (22-24°C)</option>
              <option value="warm">Warm (25°C+)</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Wind className="w-5 h-5 text-blue-600" />
          Vehicle Amenities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.ac_heating_available || false}
              onChange={(e) => updatePreference('ac_heating_available', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <Wind className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">AC/Heating</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.phone_charging_available || false}
              onChange={(e) => updatePreference('phone_charging_available', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Phone Charging</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.wifi_available || false}
              onChange={(e) => updatePreference('wifi_available', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <Wifi className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">WiFi Hotspot</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={preferences.wheelchair_accessible || false}
              onChange={(e) => updatePreference('wheelchair_accessible', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <Accessibility className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Wheelchair Accessible</span>
            </div>
          </label>

          <div className="p-4 border border-gray-200 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Child Seats Available
            </label>
            <input
              type="number"
              min="0"
              max="5"
              value={preferences.child_seats_available || 0}
              onChange={(e) => updatePreference('child_seats_available', parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Luggage & Storage
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Luggage Policy
            </label>
            <select
              value={preferences.luggage_policy || 'medium-allowed'}
              onChange={(e) => updatePreference('luggage_policy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No luggage</option>
              <option value="small-bags-only">Small bags only (backpack, purse)</option>
              <option value="medium-allowed">Medium allowed (carry-on size)</option>
              <option value="large-allowed">Large allowed (suitcases)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Luggage Space Description
            </label>
            <textarea
              value={preferences.luggage_space_description || ''}
              onChange={(e) => updatePreference('luggage_space_description', e.target.value)}
              placeholder="Describe your trunk space, special storage options..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Equipment (comma-separated)
            </label>
            <input
              type="text"
              value={preferences.special_equipment?.join(', ') || ''}
              onChange={(e) => updatePreference('special_equipment', e.target.value.split(',').map((s: string) => s.trim()))}
              placeholder="Bike rack, roof storage, ski rack..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function RidePoliciesTab({ preferences, updatePreference }: any) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Policies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Cigarette className="w-4 h-4 inline mr-2" />
              Smoking Policy
            </label>
            <select
              value={preferences.smoking_policy || 'no-smoking'}
              onChange={(e) => updatePreference('smoking_policy', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="no-smoking">No smoking</option>
              <option value="outside-only">Outside stops only</option>
              <option value="allowed">Smoking allowed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Food & Drinks Policy
            </label>
            <select
              value={preferences.food_drinks_allowed || 'snacks-ok'}
              onChange={(e) => updatePreference('food_drinks_allowed', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="none">No food or drinks</option>
              <option value="drinks-only">Drinks in sealed containers only</option>
              <option value="snacks-ok">Snacks and drinks OK</option>
              <option value="meals-ok">Meals allowed</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          <Dog className="w-5 h-5 inline mr-2" />
          Pet Policy
        </h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={preferences.pets_allowed || false}
              onChange={(e) => updatePreference('pets_allowed', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Allow pets</span>
          </label>

          {preferences.pets_allowed && (
            <div className="ml-8 p-4 bg-gray-50 rounded-lg space-y-3">
              <p className="text-sm text-gray-600">Configure pet policy details:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Allowed Pet Types
                  </label>
                  <input
                    type="text"
                    placeholder="Dogs, Cats, Small pets..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Size Limit
                  </label>
                  <select className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg">
                    <option>Small only (under 10kg)</option>
                    <option>Medium (under 25kg)</option>
                    <option>Large (any size)</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-xs text-gray-600">Carrier required</span>
              </label>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Group & Stop Policies</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Stops Allowed
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={preferences.max_stops_allowed || 3}
              onChange={(e) => updatePreference('max_stops_allowed', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Detour Time (minutes)
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={preferences.max_detour_minutes || 15}
              onChange={(e) => updatePreference('max_detour_minutes', parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.allow_groups || false}
                onChange={(e) => updatePreference('allow_groups', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Allow group bookings</span>
            </label>

            {preferences.allow_groups && (
              <div className="ml-8">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Maximum Group Size
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={preferences.max_group_size || 4}
                  onChange={(e) => updatePreference('max_group_size', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function PassengerScreeningTab({ preferences, updatePreference }: any) {
  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          Set requirements for who can book your rides. These filters help you maintain control and safety.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Instant Booking</h2>
        <label className="flex items-start gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <input
            type="checkbox"
            checked={preferences.instant_booking_enabled || false}
            onChange={(e) => updatePreference('instant_booking_enabled', e.target.checked)}
            className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mt-1"
          />
          <div>
            <span className="text-sm font-semibold text-gray-900">Enable Instant Booking</span>
            <p className="text-xs text-gray-600 mt-1">
              Passengers meeting your requirements can book instantly without approval. Get more bookings faster!
            </p>
          </div>
        </label>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rating & Verification Requirements</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Passenger Rating
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="5"
                step="0.1"
                value={preferences.minimum_passenger_rating || 0}
                onChange={(e) => updatePreference('minimum_passenger_rating', parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-gray-900 w-12 text-center">
                {(preferences.minimum_passenger_rating || 0).toFixed(1)} <Star className="w-4 h-4 inline text-yellow-500" />
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Set to 0 to accept new users without ratings
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.require_passenger_verification || false}
                onChange={(e) => updatePreference('require_passenger_verification', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Require verified passengers only</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.require_passenger_profile_photo || false}
                onChange={(e) => updatePreference('require_passenger_profile_photo', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Require profile photo</span>
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Demographic Preferences</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gender Preference
            </label>
            <select
              value={preferences.gender_preference || 'any'}
              onChange={(e) => updatePreference('gender_preference', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="any">Any gender</option>
              <option value="same">Same gender only</option>
              <option value="male">Male only</option>
              <option value="female">Female only</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={preferences.same_gender_only || false}
                onChange={(e) => updatePreference('same_gender_only', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Same gender passengers only</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Age
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={preferences.age_restriction_min || ''}
              onChange={(e) => updatePreference('age_restriction_min', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="No minimum"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Age
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={preferences.age_restriction_max || ''}
              onChange={(e) => updatePreference('age_restriction_max', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="No maximum"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={preferences.allow_minors_with_guardian || false}
                onChange={(e) => updatePreference('allow_minors_with_guardian', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Allow minors if accompanied by guardian</span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}

function SafetyCommunicationTab({ preferences, updatePreference }: any) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Safety Features</h2>
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.share_live_location_automatically || false}
              onChange={(e) => updatePreference('share_live_location_automatically', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-900">Share live location automatically</span>
              <p className="text-xs text-gray-600 mt-1">
                Passengers can track your location in real-time during the ride
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.emergency_contact_auto_notify || false}
              onChange={(e) => updatePreference('emergency_contact_auto_notify', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-900">Auto-notify emergency contact when ride starts</span>
              <p className="text-xs text-gray-600 mt-1">
                Your emergency contact will receive a notification with ride details
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.require_photo_verification_at_pickup || false}
              onChange={(e) => updatePreference('require_photo_verification_at_pickup', e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mt-1"
            />
            <div className="flex-1">
              <span className="text-sm font-semibold text-gray-900">Require photo verification at pickup</span>
              <p className="text-xs text-gray-600 mt-1">
                Passenger must verify their identity with a photo before ride starts
              </p>
            </div>
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Communication Preferences</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Communication Channels
          </label>
          <select
            value={preferences.communication_preference || 'in-app-only'}
            onChange={(e) => updatePreference('communication_preference', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="in-app-only">In-app messaging only</option>
            <option value="phone-ok">Phone calls OK</option>
            <option value="whatsapp-ok">WhatsApp OK</option>
            <option value="any">Any method</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Choose how passengers can contact you about rides
          </p>
        </div>
      </section>
    </div>
  );
}

function PricingPaymentsTab({ preferences, updatePreference }: any) {
  return (
    <div className="space-y-8">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          Payment features coming soon! Set your default pricing strategy and accepted payment methods.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing Strategy</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Pricing Model
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
              <option>Per kilometer</option>
              <option>Fixed price</option>
              <option>Negotiable</option>
              <option>Cost sharing (split fuel)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Base Price
              </label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price per KM
              </label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
            <span className="text-sm text-gray-700">Cash</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
            <span className="text-sm text-gray-700">Bank Transfer</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
            <span className="text-sm text-gray-700">PayPal</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" className="w-5 h-5 text-blue-600 rounded" />
            <span className="text-sm text-gray-700">In-app payment (coming soon)</span>
          </label>
        </div>
      </section>
    </div>
  );
}

function TemplatesTab() {
  return (
    <div className="space-y-8">
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Recurring Ride Templates</h3>
        <p className="text-gray-600 mb-6">
          Save your frequently posted rides as templates for quick posting
        </p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Create Your First Template
        </button>
      </div>
    </div>
  );
}
