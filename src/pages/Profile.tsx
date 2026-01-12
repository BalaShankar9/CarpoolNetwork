import { useState, useEffect, useRef } from 'react';
import { Car, Star, Phone, Mail, Calendar, Edit, X, Shield, AlertCircle, CheckCircle, Camera, Settings, User, Lock, BarChart3, Users, ChevronRight, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { uploadProfilePhoto } from '../services/storageService';
import { validateProfilePhoto } from '../services/faceDetection';
import { getPublicUrlSync } from '../services/storageService';
import ProfileCompletionTracker from '../components/profile/ProfileCompletionTracker';
import EmergencyContactsManager from '../components/profile/EmergencyContactsManager';
import TrustScoreVisualization from '../components/profile/TrustScoreVisualization';
import ReviewsDisplay from '../components/profile/ReviewsDisplay';
import PrivacyControls from '../components/profile/PrivacyControls';
import StatisticsDashboard from '../components/profile/StatisticsDashboard';
import DocumentUploadCenter from '../components/profile/DocumentUploadCenter';
import RideAnalyticsDashboard from '../components/profile/RideAnalyticsDashboard';
import FriendsManager from '../components/social/FriendsManager';
import AchievementsBadges from '../components/gamification/AchievementsBadges';
import ReliabilityScoreDisplay from '../components/profile/ReliabilityScoreDisplay';
import VehicleManager from '../components/profile/VehicleManager';

type TabId = 'overview' | 'vehicles' | 'safety' | 'privacy' | 'stats' | 'social';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
  { id: 'vehicles', label: 'Vehicles', icon: <Car className="w-4 h-4" /> },
  { id: 'safety', label: 'Safety & Docs', icon: <Shield className="w-4 h-4" /> },
  { id: 'privacy', label: 'Privacy', icon: <Lock className="w-4 h-4" /> },
  { id: 'stats', label: 'Stats', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'social', label: 'Social', icon: <Users className="w-4 h-4" /> },
];

interface UserPreferences {
  auto_accept_rides: boolean;
  smoking_policy: string;
  pets_allowed: boolean;
  music_preference: string;
  conversation_level: string;
  instant_booking_enabled: boolean;
}

export default function Profile() {
  const { user, profile, updateProfile, loading: authLoading, isProfileComplete, profileMissingFields } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  
  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    auto_accept_rides: false,
    smoking_policy: 'no-smoking',
    pets_allowed: false,
    music_preference: 'any',
    conversation_level: 'any',
    instant_booking_enabled: false,
  });
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: '',
    phone_e164: '',
    country: '',
    city: '',
    bio: '',
    whatsapp_number: '',
    preferred_contact_method: 'both' as 'in_app' | 'whatsapp' | 'both',
  });

  // Get current tab from URL or default to 'overview'
  const currentTab = (searchParams.get('tab') as TabId) || 'overview';

  const setCurrentTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: true });
  };

  // Handle URL params for backwards compatibility
  useEffect(() => {
    const editParam = searchParams.get('edit');
    const sectionParam = searchParams.get('section');

    if (editParam === 'true' || editParam === 'bio' || editParam === 'phone' || editParam === 'photo') {
      setShowEditProfile(true);
      searchParams.delete('edit');
      setSearchParams(searchParams, { replace: true });
    }

    if (sectionParam === 'vehicles') {
      setCurrentTab('vehicles');
      searchParams.delete('section');
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/signin');
      return;
    }
    if (profile) {
      loadPreferences();
      setEditForm({
        full_name: profile.full_name || '',
        phone_e164: profile.phone_e164 || profile.phone || '',
        country: profile.country || '',
        city: profile.city || '',
        bio: profile.bio || '',
        whatsapp_number: (profile as any).whatsapp_number || '',
        preferred_contact_method: (profile as any).preferred_contact_method || 'both',
      });
    }
  }, [profile, authLoading, user, navigate]);

  const loadPreferences = async () => {
    if (!profile?.id) return;
    try {
      setPreferencesLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('auto_accept_rides, smoking_policy, pets_allowed, music_preference, conversation_level, instant_booking_enabled')
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          auto_accept_rides: data.auto_accept_rides ?? false,
          smoking_policy: data.smoking_policy ?? 'no-smoking',
          pets_allowed: data.pets_allowed ?? false,
          music_preference: data.music_preference ?? 'any',
          conversation_level: data.conversation_level ?? 'any',
          instant_booking_enabled: data.instant_booking_enabled ?? false,
        });
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
    } finally {
      setPreferencesLoading(false);
    }
  };

  const updatePreference = async (key: keyof UserPreferences, value: boolean | string) => {
    if (!profile?.id) return;
    try {
      setPreferencesSaving(true);
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: profile.id, [key]: value }, { onConflict: 'user_id' });

      if (error) throw error;
      setPreferences(prev => ({ ...prev, [key]: value }));
      setSuccess('Preference updated');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error updating preference:', err);
      setError('Failed to update preference');
      setTimeout(() => setError(''), 3000);
    } finally {
      setPreferencesSaving(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const phoneE164 = editForm.phone_e164.trim() || null;
      const updates = {
        full_name: editForm.full_name,
        phone_e164: phoneE164,
        phone: phoneE164,
        phone_number: phoneE164,
        country: editForm.country || null,
        city: editForm.city || null,
        bio: editForm.bio,
        whatsapp_number: editForm.whatsapp_number || null,
        preferred_contact_method: editForm.preferred_contact_method,
      };
      const { error } = await updateProfile(updates);
      if (error) {
        setError(error.message);
      } else {
        setSuccess('Profile updated successfully!');
        setShowEditProfile(false);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    setError('');
    setSuccess('');
    setUploadingProfileImage(true);

    try {
      const validation = await validateProfilePhoto(file);
      if (!validation.valid) {
        setError(validation.message);
        return;
      }

      if (!profile?.id) {
        setError('Profile not found');
        return;
      }

      const { optimizedPath, thumbnailPath, optimizedUrl } = await uploadProfilePhoto(
        profile.id,
        file,
        (progress) => console.log(`Upload progress: ${progress}%`)
      );

      const { error: updateError } = await updateProfile({
        profile_photo_path: optimizedPath,
        profile_photo_thumb_path: thumbnailPath,
        profile_photo_url: optimizedUrl,
        avatar_url: optimizedUrl,
        profile_verified: true
      } as any);

      if (updateError) throw updateError;

      setSuccess('Profile photo uploaded and verified!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile photo');
    } finally {
      setUploadingProfileImage(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 flex items-center justify-center">
        <div className="bg-white shadow-sm rounded-lg p-6 text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Please sign in</h2>
          <p className="text-gray-600 mb-4">You need to be signed in to view your profile.</p>
          <button
            onClick={() => navigate('/signin')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile.full_name || 'Unnamed';
  const profilePhotoUrl = profile.profile_photo_url
    || profile.avatar_url
    || ((profile as any).profile_photo_path ? getPublicUrlSync((profile as any).profile_photo_path) : '');

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-4">
      {/* Compact Header with Avatar */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-200 overflow-hidden">
              {profilePhotoUrl ? (
                <img src={profilePhotoUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-blue-600">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {profile.profile_verified && (
              <div className="absolute -bottom-1 -right-1 p-0.5 bg-green-500 text-white rounded-full">
                <CheckCircle className="w-4 h-4" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              ref={profileImageInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleProfileImageUpload(file);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <button
              onClick={() => profileImageInputRef.current?.click()}
              disabled={uploadingProfileImage}
              className="absolute -bottom-1 -left-1 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:bg-blue-300 shadow"
              title="Upload photo"
            >
              {uploadingProfileImage ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Name and Quick Stats */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900 truncate">{displayName}</h1>
              {!isProfileComplete && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                  Incomplete
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                {profile.average_rating?.toFixed(1) || '0.0'}
              </span>
              <span>{profile.total_rides_offered || 0} rides</span>
            </div>
          </div>

          {/* Quick Edit Button */}
          <button
            onClick={() => setShowEditProfile(true)}
            className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            title="Edit Profile"
          >
            <Edit className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Profile Completion Alert */}
        {!isProfileComplete && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Complete your profile to unlock all features
            </p>
            <button
              onClick={() => setShowEditProfile(true)}
              className="mt-2 text-sm text-amber-700 font-medium hover:underline flex items-center gap-1"
            >
              Complete now <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Tab Navigation - Horizontally Scrollable */}
      <div 
        ref={tabsContainerRef}
        className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors flex-shrink-0 ${
              currentTab === tab.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Success/Error Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Tab Content */}
      <div className="space-y-4">
        {currentTab === 'overview' && (
          <>
            <ProfileCompletionTracker />
            
            {/* Trust & Reliability Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReliabilityScoreDisplay />
              <TrustScoreVisualization />
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  onClick={() => setShowEditProfile(true)}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  <Edit className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                  <span className="text-xs text-gray-600">Edit Profile</span>
                </button>
                <button
                  onClick={() => setCurrentTab('vehicles')}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  <Plus className="w-5 h-5 mx-auto mb-1 text-green-600" />
                  <span className="text-xs text-gray-600">Add Vehicle</span>
                </button>
                <button
                  onClick={() => setCurrentTab('safety')}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  <Shield className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                  <span className="text-xs text-gray-600">Upload Docs</span>
                </button>
                <button
                  onClick={() => navigate('/security')}
                  className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-center"
                >
                  <Settings className="w-5 h-5 mx-auto mb-1 text-gray-600" />
                  <span className="text-xs text-gray-600">Security</span>
                </button>
              </div>
            </div>

            {/* Basic Info Card */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Contact Info</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{profile.email}</span>
                </div>
                {(profile.phone_e164 || profile.phone) && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">{profile.phone_e164 || profile.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                </div>
              </div>
              {profile.bio && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">{profile.bio}</p>
                </div>
              )}
            </div>

            {/* Achievements Preview */}
            <AchievementsBadges />
          </>
        )}

        {currentTab === 'vehicles' && (
          <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
            <VehicleManager />
          </div>
        )}

        {currentTab === 'safety' && (
          <>
            <DocumentUploadCenter />
            <EmergencyContactsManager />
          </>
        )}

        {currentTab === 'privacy' && (
          <>
            <PrivacyControls />
            
            {/* Ride Preferences */}
            <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Ride Preferences</h3>
                {preferencesSaving && <span className="text-sm text-blue-600">Saving...</span>}
              </div>

              {preferencesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">Auto-accept requests</p>
                      <p className="text-sm text-gray-500">Automatically accept matching requests</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.auto_accept_rides}
                        onChange={(e) => updatePreference('auto_accept_rides', e.target.checked)}
                        disabled={preferencesSaving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">Instant booking</p>
                      <p className="text-sm text-gray-500">Allow instant bookings without approval</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.instant_booking_enabled}
                        onChange={(e) => updatePreference('instant_booking_enabled', e.target.checked)}
                        disabled={preferencesSaving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium text-gray-900">Pets allowed</p>
                      <p className="text-sm text-gray-500">Allow pets in your vehicle</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={preferences.pets_allowed}
                        onChange={(e) => updatePreference('pets_allowed', e.target.checked)}
                        disabled={preferencesSaving}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="py-2">
                    <label className="block font-medium text-gray-900 mb-2">Smoking policy</label>
                    <select
                      value={preferences.smoking_policy}
                      onChange={(e) => updatePreference('smoking_policy', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={preferencesSaving}
                    >
                      <option value="no-smoking">No smoking</option>
                      <option value="smoking-allowed">Smoking allowed</option>
                      <option value="e-cigarettes-only">E-cigarettes only</option>
                    </select>
                  </div>

                  <div className="py-2">
                    <label className="block font-medium text-gray-900 mb-2">Music preference</label>
                    <select
                      value={preferences.music_preference}
                      onChange={(e) => updatePreference('music_preference', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={preferencesSaving}
                    >
                      <option value="quiet">Prefer quiet</option>
                      <option value="background">Background music</option>
                      <option value="any">Any music</option>
                      <option value="no-preference">No preference</option>
                    </select>
                  </div>

                  <div className="py-2">
                    <label className="block font-medium text-gray-900 mb-2">Conversation level</label>
                    <select
                      value={preferences.conversation_level}
                      onChange={(e) => updatePreference('conversation_level', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      disabled={preferencesSaving}
                    >
                      <option value="quiet">Prefer quiet</option>
                      <option value="small-talk">Small talk</option>
                      <option value="chatty">Chatty</option>
                      <option value="no-preference">No preference</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {currentTab === 'stats' && (
          <>
            <StatisticsDashboard />
            <RideAnalyticsDashboard />
            <ReviewsDisplay />
          </>
        )}

        {currentTab === 'social' && (
          <FriendsManager />
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
              <button
                onClick={() => setShowEditProfile(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editForm.phone_e164}
                  onChange={(e) => setEditForm({ ...editForm, phone_e164: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+447700900000"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={editForm.country}
                    onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="GB"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="London"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="tel"
                  value={editForm.whatsapp_number}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Preference</label>
                <select
                  value={editForm.preferred_contact_method}
                  onChange={(e) => setEditForm({ ...editForm, preferred_contact_method: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="in_app">In-app only</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="flex-1 border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
