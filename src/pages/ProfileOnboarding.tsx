import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Camera,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Shield,
  Sparkles,
  Car,
  Users,
  Leaf,
  Upload,
  Image as ImageIcon,
  Globe,
  MessageSquare,
  Lock,
  Eye,
  Heart,
  Star,
  Zap,
  Award,
  Search,
  Flag,
  Calendar,
  Music,
  Volume2,
  PawPrint,
  Cigarette,
  Briefcase,
  AlertTriangle,
  Loader,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { countryCodes, defaultCountry } from '../data/countryCodes';
import { normalizePhoneNumber } from '../utils/phone';
import { getProfileMissingFields } from '../utils/profileCompleteness';
import PhoneVerificationStep from '../components/onboarding/PhoneVerificationStep';

// Helper function to get location from browser
async function getLocationFromBrowser(): Promise<{ country: string; city: string } | null> {
  try {
    // First try IP-based geolocation (faster, no permission required)
    const response = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(5000)
    });
    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_code || '',
        city: data.city || ''
      };
    }
  } catch (e) {
    console.log('IP geolocation failed, trying browser geolocation');
  }

  // Fallback to browser geolocation + reverse geocoding
  if ('geolocation' in navigator) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        });
      });

      // Use Nominatim for reverse geocoding (free, no API key)
      const { latitude, longitude } = position.coords;
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (geoResponse.ok) {
        const geoData = await geoResponse.json();
        return {
          country: geoData.address?.country_code?.toUpperCase() || '',
          city: geoData.address?.city || geoData.address?.town || geoData.address?.village || ''
        };
      }
    } catch (e) {
      console.log('Browser geolocation failed:', e);
    }
  }

  return null;
}

// Helper function to generate auto bio
function generateAutoBio(name: string, city: string, occupation: string, preferences: {
  smoking_policy: string;
  music_preference: string;
  conversation_level: string;
}): string {
  const firstName = name.split(' ')[0] || 'there';
  const parts: string[] = [];

  // Intro
  parts.push(`Hi, I'm ${firstName}!`);

  // Location
  if (city) {
    parts.push(`Based in ${city}.`);
  }

  // Occupation
  if (occupation) {
    parts.push(`Working as a ${occupation}.`);
  }

  // Preferences
  const prefParts: string[] = [];
  if (preferences.conversation_level === 'chatty') {
    prefParts.push('love a good chat');
  } else if (preferences.conversation_level === 'quiet') {
    prefParts.push('prefer quiet rides');
  }

  if (preferences.music_preference === 'radio') {
    prefParts.push('enjoy music on drives');
  } else if (preferences.music_preference === 'podcasts') {
    prefParts.push('love podcasts');
  }

  if (prefParts.length > 0) {
    parts.push(`I ${prefParts.join(' and ')}.`);
  }

  // Closing
  parts.push('Looking forward to sharing rides! 🚗');

  return parts.join(' ');
}

type StepKey = 'welcome' | 'basics' | 'photo' | 'phone' | 'preferences' | 'details' | 'complete';

interface StepInfo {
  key: StepKey;
  title: string;
  subtitle: string;
  icon: typeof User;
  color: string;
  bgColor: string;
}

const steps: StepInfo[] = [
  {
    key: 'welcome',
    title: 'Welcome to the Community',
    subtitle: 'Join thousands of carpoolers',
    icon: Heart,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
  {
    key: 'basics',
    title: 'Tell Us About You',
    subtitle: 'Help others recognize you',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    key: 'photo',
    title: 'Add Your Photo',
    subtitle: 'Build trust with a real photo',
    icon: Camera,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    key: 'phone',
    title: 'Verify Your Phone',
    subtitle: 'Secure your account',
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  {
    key: 'preferences',
    title: 'Ride Preferences',
    subtitle: 'Set your comfort settings',
    icon: Car,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  {
    key: 'details',
    title: 'Final Touches',
    subtitle: 'Customize your profile',
    icon: Sparkles,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    key: 'complete',
    title: "You're All Set!",
    subtitle: 'Welcome to the community',
    icon: Award,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
];

const communityStats = [
  { icon: Users, value: '10,000+', label: 'Active Members' },
  { icon: Car, value: '50,000+', label: 'Rides Shared' },
  { icon: Leaf, value: '120 tons', label: 'CO2 Saved' },
];

const trustFeatures = [
  { icon: Shield, text: 'Verified phone numbers' },
  { icon: Star, text: 'Community ratings' },
  { icon: Lock, text: 'Secure messaging' },
];

export default function ProfileOnboarding() {
  const { user, profile, updateProfile, isProfileComplete, profileMissingFields } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);

  const [basicForm, setBasicForm] = useState({
    full_name: '',
    country: '',
    nationality: '',
    city: '',
    date_of_birth: '',
    gender: '' as '' | 'male' | 'female' | 'non-binary' | 'prefer-not-to-say',
    occupation: '',
  });
  const [preferencesForm, setPreferencesForm] = useState({
    smoking_policy: 'no-smoking' as 'no-smoking' | 'smoking-allowed' | 'ask-first',
    pets_allowed: false,
    music_preference: 'any' as 'any' | 'quiet' | 'radio' | 'podcasts',
    conversation_level: 'chatty' as 'quiet' | 'some-chat' | 'chatty',
    luggage_size: 'medium' as 'small' | 'medium' | 'large',
  });
  const [detailsForm, setDetailsForm] = useState({
    bio: '',
    languages: '',
    whatsapp_e164: '',
    phone_visibility: 'ride_only' as 'none' | 'friends' | 'ride_only' | 'anyone',
    whatsapp_visibility: 'friends' as 'none' | 'friends' | 'ride_only' | 'anyone',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const returnTo = (location.state as { from?: string } | null)?.from || '/';

  useEffect(() => {
    if (!profile) return;
    setBasicForm({
      full_name: profile.full_name || '',
      country: profile.country || '',
      nationality: (profile as any).nationality || '',
      city: profile.city || '',
      date_of_birth: profile.date_of_birth || '',
      gender: profile.gender || '',
      occupation: (profile as any).occupation || '',
    });
    setPreferencesForm({
      smoking_policy: (profile as any).smoking_policy || 'no-smoking',
      pets_allowed: (profile as any).pets_allowed || false,
      music_preference: (profile as any).music_preference || 'any',
      conversation_level: (profile as any).conversation_level || 'chatty',
      luggage_size: (profile as any).luggage_size || 'medium',
    });
    setDetailsForm({
      bio: profile.bio || '',
      languages: (profile.languages || []).join(', '),
      whatsapp_e164: profile.whatsapp_e164 || profile.whatsapp_number || '',
      phone_visibility: profile.phone_visibility || 'ride_only',
      whatsapp_visibility: profile.whatsapp_visibility || 'friends',
      emergency_contact_name: (profile as any).emergency_contact_name || '',
      emergency_contact_phone: (profile as any).emergency_contact_phone || '',
    });
    if (profile.avatar_url) {
      setPhotoPreview(profile.avatar_url);
    }

    // Auto-detect location if not already set
    if (!profile.country && !profile.city && !locationDetected) {
      setLoadingLocation(true);
      getLocationFromBrowser().then((loc) => {
        if (loc) {
          setBasicForm(prev => ({
            ...prev,
            country: prev.country || loc.country,
            city: prev.city || loc.city,
          }));
          setLocationDetected(true);
        }
        setLoadingLocation(false);
      }).catch(() => setLoadingLocation(false));
    }
  }, [profile, locationDetected]);

  const initialStep = useMemo(() => {
    if (!profile) return 0;
    const missing = getProfileMissingFields(profile);
    if (missing.includes('full_name') || missing.includes('country')) {
      return 1;
    }
    if (missing.includes('avatar')) {
      return 2;
    }
    if (missing.includes('phone') || missing.includes('phone_verified')) {
      return 3;
    }
    // Check if preferences are set
    if (!(profile as any).smoking_policy) {
      return 4;
    }
    return 5;
  }, [profile]);

  useEffect(() => {
    if (!initialized) {
      setCurrentStep(initialStep);
      setInitialized(true);
    }
  }, [initialStep, initialized]);

  if (!user) {
    return null;
  }

  const handleBasicsSave = async () => {
    setError('');
    if (!basicForm.full_name.trim() || basicForm.full_name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!basicForm.country.trim()) {
      setError('Please select your country of residence.');
      return;
    }
    if (!basicForm.nationality.trim()) {
      setError('Please select your nationality.');
      return;
    }
    if (!basicForm.city.trim()) {
      setError('Please enter your city. This is required to connect you with local carpoolers.');
      return;
    }
    if (!basicForm.date_of_birth) {
      setError('Please enter your date of birth. You must be 18+ to use the platform.');
      return;
    }
    // Validate age - must be 18+
    const birthDate = new Date(basicForm.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    if (age < 18) {
      setError('You must be at least 18 years old to use this platform.');
      return;
    }
    if (!basicForm.gender) {
      setError('Please select your gender.');
      return;
    }
    setSaving(true);
    const updates: Record<string, any> = {
      full_name: basicForm.full_name.trim(),
      country: basicForm.country.trim(),
      nationality: basicForm.nationality.trim(),
      city: basicForm.city.trim(),
      home_city: basicForm.city.trim(), // Also set home_city for matching
      date_of_birth: basicForm.date_of_birth,
      gender: basicForm.gender,
      occupation: basicForm.occupation.trim() || null,
    };
    const { error: updateError } = await updateProfile(updates);
    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save. Please try again.');
      return;
    }

    setCurrentStep(2);
  };

  const handlePhotoSelect = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, or WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB.');
      return;
    }

    setUploadingPhoto(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `avatars/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = data.publicUrl;
      setPhotoPreview(avatarUrl);

      const { error: updateError } = await updateProfile({
        avatar_url: avatarUrl,
        profile_photo_url: avatarUrl,
      });

      if (updateError) throw updateError;

      setTimeout(() => setCurrentStep(3), 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePhotoSelect(e.dataTransfer.files[0]);
    }
  };

  const handlePhoneVerified = async (phoneE164: string) => {
    setError('');
    const { error: updateError } = await updateProfile({
      phone_e164: phoneE164,
      phone: phoneE164,
      phone_number: phoneE164,
      phone_verified: true,
    });

    if (updateError) {
      setError(updateError.message || 'Failed to save verified phone.');
      return;
    }

    setCurrentStep(4); // Go to preferences step
  };

  const handlePreferencesSave = async () => {
    setError('');
    setSaving(true);
    const updates: Record<string, any> = {
      smoking_policy: preferencesForm.smoking_policy,
      pets_allowed: preferencesForm.pets_allowed,
      music_preference: preferencesForm.music_preference,
      conversation_level: preferencesForm.conversation_level,
      luggage_size: preferencesForm.luggage_size,
    };
    const { error: updateError } = await updateProfile(updates);
    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save preferences. Please try again.');
      return;
    }

    // Auto-generate bio if empty
    if (!detailsForm.bio.trim()) {
      const autoBio = generateAutoBio(
        basicForm.full_name,
        basicForm.city,
        basicForm.occupation,
        preferencesForm
      );
      setDetailsForm(prev => ({ ...prev, bio: autoBio }));
    }

    setCurrentStep(5); // Go to details step
  };

  const handleDetailsSave = async () => {
    setError('');

    // Use auto-generated bio if still empty
    let bioToSave = detailsForm.bio.trim();
    if (!bioToSave) {
      bioToSave = generateAutoBio(
        basicForm.full_name,
        basicForm.city,
        basicForm.occupation,
        preferencesForm
      );
    }

    const languages = detailsForm.languages
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    let whatsappE164: string | null = null;
    if (detailsForm.whatsapp_e164.trim()) {
      const normalized = normalizePhoneNumber(detailsForm.whatsapp_e164.trim());
      if (!normalized.isValid || !normalized.e164) {
        setError(normalized.error || 'Please enter a valid WhatsApp number.');
        return;
      }
      whatsappE164 = normalized.e164;
    }

    // Validate emergency contact if name is provided
    let emergencyPhone: string | null = null;
    if (detailsForm.emergency_contact_name.trim() && detailsForm.emergency_contact_phone.trim()) {
      const normalized = normalizePhoneNumber(detailsForm.emergency_contact_phone.trim());
      if (!normalized.isValid || !normalized.e164) {
        setError('Please enter a valid emergency contact phone number.');
        return;
      }
      emergencyPhone = normalized.e164;
    }

    setSaving(true);
    const updates: Record<string, any> = {
      bio: bioToSave || null,
      languages: languages.length ? languages : null,
      whatsapp_e164: whatsappE164,
      whatsapp_number: whatsappE164,
      phone_visibility: detailsForm.phone_visibility,
      whatsapp_visibility: detailsForm.whatsapp_visibility,
      emergency_contact_name: detailsForm.emergency_contact_name.trim() || null,
      emergency_contact_phone: emergencyPhone,
      onboarding_completed: true,
    };
    const { error: updateError } = await updateProfile(updates);
    setSaving(false);

    if (updateError) {
      setError(updateError.message || 'Failed to save. Please try again.');
      return;
    }

    setShowConfetti(true);
    setCurrentStep(6);
  };

  const handleFinish = () => {
    navigate(returnTo);
  };

  const progress = (currentStep / (steps.length - 1)) * 100;
  const step = steps[currentStep];

  if (isProfileComplete && profileMissingFields.length === 0 && currentStep !== 6) {
    setCurrentStep(6);
    setShowConfetti(true);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#3B82F6', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B'][
                  Math.floor(Math.random() * 5)
                ],
                width: `${Math.random() * 10 + 5}px`,
                height: `${Math.random() * 10 + 5}px`,
                borderRadius: Math.random() > 0.5 ? '50%' : '0',
              }}
            />
          ))}
        </div>
      )}

      <div className="flex min-h-screen">
        {/* Left Panel - Branding & Stats */}
        <div className="hidden lg:flex lg:w-2/5 xl:w-1/3 bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-8 flex-col justify-between relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-10 w-64 h-64 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
          </div>

          <div className="relative z-10">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <Car className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Carpool Network</h1>
                <p className="text-blue-200 text-sm">Community Ridesharing</p>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="mb-12">
              <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
                Join the UK's Most Trusted<br />Carpooling Community
              </h2>
              <p className="text-blue-100 text-lg">
                Connect with verified members, share journeys, and help reduce carbon emissions together.
              </p>
            </div>

            {/* Community Stats */}
            <div className="grid grid-cols-3 gap-4 mb-12">
              {communityStats.map((stat, index) => (
                <div key={index} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <stat.icon className="w-6 h-6 text-blue-200 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-blue-200">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Trust Features */}
            <div className="space-y-3">
              {trustFeatures.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-blue-100">
                  <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-blue-200" />
                  </div>
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 text-blue-200 text-sm">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex-1 flex flex-col">
          {/* Progress Bar */}
          <div className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-40">
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${step.bgColor} flex items-center justify-center`}>
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-500">{step.subtitle}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-400">
                  {currentStep + 1} / {steps.length}
                </span>
              </div>

              {/* Step Indicators */}
              <div className="flex gap-2">
                {steps.map((s, index) => (
                  <div
                    key={s.key}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${index < currentStep
                      ? 'bg-green-500'
                      : index === currentStep
                        ? 'bg-blue-600'
                        : 'bg-gray-200'
                      }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8">
              {error && (
                <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                  <span>{error}</span>
                </div>
              )}

              {/* Welcome Step */}
              {step.key === 'welcome' && (
                <div className="text-center py-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-rose-100 to-pink-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-rose-100">
                    <Heart className="w-12 h-12 text-rose-500" />
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Welcome to Carpool Network!
                  </h1>
                  <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
                    Let's set up your profile so you can start sharing rides with our amazing community.
                  </p>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-8">
                    <h3 className="font-semibold text-gray-900 mb-4">What you'll need:</h3>
                    <div className="grid md:grid-cols-3 gap-4 text-left">
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <User className="w-6 h-6 text-blue-600 mb-2" />
                        <div className="font-medium text-gray-900">Your Name</div>
                        <div className="text-sm text-gray-500">So others can recognize you</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <Camera className="w-6 h-6 text-purple-600 mb-2" />
                        <div className="font-medium text-gray-900">A Photo</div>
                        <div className="text-sm text-gray-500">Build trust with a clear photo</div>
                      </div>
                      <div className="bg-white rounded-xl p-4 shadow-sm">
                        <Phone className="w-6 h-6 text-emerald-600 mb-2" />
                        <div className="font-medium text-gray-900">Phone Number</div>
                        <div className="text-sm text-gray-500">For verification & contact</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 mb-8">
                    This takes about 2 minutes. Your information is protected by our privacy policy.
                  </p>

                  <button
                    onClick={() => setCurrentStep(1)}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-3 mx-auto"
                  >
                    Let's Get Started
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Basics Step */}
              {step.key === 'basics' && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-100">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Tell us about yourself</h2>
                    <p className="text-gray-600">This helps other members recognize and trust you</p>
                  </div>

                  <div className="space-y-6">
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        What's your name? *
                      </label>
                      <input
                        type="text"
                        value={basicForm.full_name}
                        onChange={(e) => setBasicForm({ ...basicForm, full_name: e.target.value })}
                        placeholder="Enter your full name"
                        data-testid="onboarding-full-name"
                        className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        Use your real name - it helps build trust in the community
                      </p>
                    </div>

                    {/* Country and Nationality - Side by Side */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Country of residence *
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select
                            value={basicForm.country}
                            onChange={(e) => setBasicForm({ ...basicForm, country: e.target.value })}
                            data-testid="onboarding-country"
                            className="w-full pl-12 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none bg-white"
                          >
                            <option value="">Select country</option>
                            {countryCodes.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Nationality *
                        </label>
                        <div className="relative">
                          <Flag className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select
                            value={basicForm.nationality}
                            onChange={(e) => setBasicForm({ ...basicForm, nationality: e.target.value })}
                            data-testid="onboarding-nationality"
                            className="w-full pl-12 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none bg-white"
                          >
                            <option value="">Select nationality</option>
                            {countryCodes.map((country) => (
                              <option key={country.code} value={country.code}>
                                {country.flag} {country.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* City - REQUIRED for local matching */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Your City *
                        {loadingLocation && (
                          <span className="ml-2 text-blue-600 text-xs font-normal inline-flex items-center gap-1">
                            <Loader className="w-3 h-3 animate-spin" />
                            Detecting location...
                          </span>
                        )}
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={basicForm.city}
                          onChange={(e) => setBasicForm({ ...basicForm, city: e.target.value })}
                          placeholder={loadingLocation ? "Detecting your city..." : "e.g., London, Manchester, Birmingham"}
                          data-testid="onboarding-city"
                          className="w-full pl-12 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        {locationDetected ? '✓ Location auto-detected - feel free to adjust' : 'Required - This helps match you with carpoolers in your area'}
                      </p>
                    </div>

                    {/* Date of Birth and Gender - Side by Side */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Date of birth *
                        </label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <input
                            type="date"
                            value={basicForm.date_of_birth}
                            onChange={(e) => setBasicForm({ ...basicForm, date_of_birth: e.target.value })}
                            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                            className="w-full pl-12 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-400">Required - Must be 18+ to use the platform</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Gender *
                        </label>
                        <select
                          value={basicForm.gender}
                          onChange={(e) => setBasicForm({ ...basicForm, gender: e.target.value as any })}
                          className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all appearance-none bg-white"
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="non-binary">Non-binary</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                        <p className="mt-1 text-xs text-gray-400">Used for matching preferences</p>
                      </div>
                    </div>

                    {/* Occupation */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Occupation <span className="font-normal text-gray-400">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={basicForm.occupation}
                          onChange={(e) => setBasicForm({ ...basicForm, occupation: e.target.value })}
                          placeholder="e.g., Software Engineer, Teacher, Student"
                          className="w-full pl-12 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-400">Helps build trust and conversation</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo Step */}
              {step.key === 'photo' && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-100">
                      <Camera className="w-10 h-10 text-purple-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Add your photo</h2>
                    <p className="text-gray-600">Members with photos get 5x more ride connections</p>
                  </div>

                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${dragActive
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                      }`}
                  >
                    {photoPreview ? (
                      <div className="flex flex-col items-center">
                        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-xl mb-6">
                          <img
                            src={photoPreview}
                            alt="Profile preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-green-600 mb-4">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">Photo uploaded successfully!</span>
                        </div>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="text-purple-600 hover:text-purple-700 font-medium"
                        >
                          Choose a different photo
                        </button>
                      </div>
                    ) : (
                      <div className="py-8">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                          {uploadingPhoto ? (
                            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <ImageIcon className="w-10 h-10 text-gray-400" />
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {uploadingPhoto ? 'Uploading...' : 'Drag and drop your photo here'}
                        </h3>
                        <p className="text-gray-500 mb-6">or click to browse from your device</p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          <Upload className="w-5 h-5 inline mr-2" />
                          Upload Photo
                        </button>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      data-testid="onboarding-photo-input"
                      disabled={uploadingPhoto}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handlePhotoSelect(file);
                          e.target.value = '';
                        }
                      }}
                    />
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-900 mb-3">Photo tips for best results:</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Use a recent photo where your face is clearly visible</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Good lighting helps others recognize you</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Avoid group photos, logos, or objects</span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}

              {/* Phone Step */}
              {step.key === 'phone' && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-100">
                      <Shield className="w-10 h-10 text-emerald-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify your phone</h2>
                    <p className="text-gray-600">This keeps our community safe and trusted</p>
                  </div>

                  <div className="bg-emerald-50 rounded-xl p-5 mb-6">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold text-emerald-900">Why verify your phone?</h4>
                        <p className="text-sm text-emerald-700 mt-1">
                          Phone verification helps prevent fake accounts and ensures all members can be
                          reached for ride coordination. Your number is only shared with ride partners.
                        </p>
                      </div>
                    </div>
                  </div>

                  <PhoneVerificationStep onVerified={handlePhoneVerified} disabled={saving} />

                  {profile?.phone_verified && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-900">Phone verified!</div>
                        <div className="text-sm text-green-700">
                          Your phone number has been confirmed
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preferences Step */}
              {step.key === 'preferences' && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-100">
                      <Car className="w-10 h-10 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Your ride preferences</h2>
                    <p className="text-gray-600">Help us match you with compatible riders</p>
                  </div>

                  <div className="space-y-6">
                    {/* Smoking Policy */}
                    <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                          <Cigarette className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Smoking policy</h4>
                          <p className="text-sm text-gray-500">Your preference for smoking in rides</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'no-smoking', label: 'No smoking', emoji: '🚭' },
                          { value: 'ask-first', label: 'Ask first', emoji: '❓' },
                          { value: 'smoking-allowed', label: 'Allowed', emoji: '🚬' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setPreferencesForm({ ...preferencesForm, smoking_policy: option.value as any })}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${preferencesForm.smoking_policy === option.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                          >
                            <span className="text-2xl block mb-1">{option.emoji}</span>
                            <span className="text-sm font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Pets Allowed */}
                    <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                            <PawPrint className="w-5 h-5 text-amber-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Pets welcome?</h4>
                            <p className="text-sm text-gray-500">Do you allow pets in your rides?</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setPreferencesForm({ ...preferencesForm, pets_allowed: !preferencesForm.pets_allowed })}
                          className={`relative w-14 h-8 rounded-full transition-colors ${preferencesForm.pets_allowed ? 'bg-indigo-600' : 'bg-gray-300'
                            }`}
                        >
                          <span
                            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${preferencesForm.pets_allowed ? 'left-7' : 'left-1'
                              }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Music Preference */}
                    <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Music className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Music preference</h4>
                          <p className="text-sm text-gray-500">What do you like during rides?</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { value: 'quiet', label: 'Quiet', emoji: '🔇' },
                          { value: 'radio', label: 'Radio', emoji: '📻' },
                          { value: 'podcasts', label: 'Podcasts', emoji: '🎙️' },
                          { value: 'any', label: 'Anything', emoji: '🎵' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setPreferencesForm({ ...preferencesForm, music_preference: option.value as any })}
                            className={`p-3 rounded-xl border-2 transition-all text-center ${preferencesForm.music_preference === option.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                          >
                            <span className="text-xl block mb-1">{option.emoji}</span>
                            <span className="text-xs font-medium">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Conversation Level */}
                    <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Volume2 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Conversation level</h4>
                          <p className="text-sm text-gray-500">How chatty are you during rides?</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'quiet', label: 'Quiet ride', emoji: '🤫', desc: 'Prefer silence' },
                          { value: 'some-chat', label: 'Some chat', emoji: '💬', desc: 'Occasional talk' },
                          { value: 'chatty', label: 'Chatty', emoji: '🗣️', desc: 'Love to talk!' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setPreferencesForm({ ...preferencesForm, conversation_level: option.value as any })}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${preferencesForm.conversation_level === option.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                          >
                            <span className="text-2xl block mb-1">{option.emoji}</span>
                            <span className="text-sm font-medium block">{option.label}</span>
                            <span className="text-xs text-gray-500">{option.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Luggage Size */}
                    <div className="bg-white border-2 border-gray-100 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">Typical luggage</h4>
                          <p className="text-sm text-gray-500">How much space do you usually need?</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'small', label: 'Small', emoji: '🎒', desc: 'Backpack only' },
                          { value: 'medium', label: 'Medium', emoji: '💼', desc: 'Carry-on bag' },
                          { value: 'large', label: 'Large', emoji: '🧳', desc: 'Full suitcase' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => setPreferencesForm({ ...preferencesForm, luggage_size: option.value as any })}
                            className={`p-4 rounded-xl border-2 transition-all text-center ${preferencesForm.luggage_size === option.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                          >
                            <span className="text-2xl block mb-1">{option.emoji}</span>
                            <span className="text-sm font-medium block">{option.label}</span>
                            <span className="text-xs text-gray-500">{option.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Details Step */}
              {step.key === 'details' && (
                <div className="space-y-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-100">
                      <Sparkles className="w-10 h-10 text-amber-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Final touches</h2>
                    <p className="text-gray-600">Add a bit more about yourself (all optional)</p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        About you
                      </label>
                      <textarea
                        value={detailsForm.bio}
                        onChange={(e) => setDetailsForm({ ...detailsForm, bio: e.target.value })}
                        placeholder="Tell other members a bit about yourself..."
                        rows={4}
                        className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all resize-none"
                      />
                      <p className="mt-2 text-sm text-gray-500">
                        e.g., "Commute daily between London and Cambridge. Love podcasts and coffee!"
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Languages you speak
                      </label>
                      <input
                        type="text"
                        value={detailsForm.languages}
                        onChange={(e) => setDetailsForm({ ...detailsForm, languages: e.target.value })}
                        placeholder="e.g., English, French, Spanish"
                        className="w-full px-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all"
                      />
                      <p className="mt-2 text-sm text-gray-500">Separate with commas</p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        WhatsApp number
                      </label>
                      <div className="relative">
                        <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          placeholder={defaultCountry.dialCode + '...'}
                          value={detailsForm.whatsapp_e164}
                          onChange={(e) =>
                            setDetailsForm({ ...detailsForm, whatsapp_e164: e.target.value })
                          }
                          className="w-full pl-12 pr-5 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all"
                        />
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Optional - some members prefer WhatsApp for quick coordination
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-gray-600" />
                        Privacy settings
                      </h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Who can see your phone?
                          </label>
                          <select
                            value={detailsForm.phone_visibility}
                            onChange={(e) =>
                              setDetailsForm({
                                ...detailsForm,
                                phone_visibility: e.target.value as any,
                              })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all"
                          >
                            <option value="ride_only">Ride partners only</option>
                            <option value="friends">Friends only</option>
                            <option value="anyone">Anyone</option>
                            <option value="none">No one</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Who can see your WhatsApp?
                          </label>
                          <select
                            value={detailsForm.whatsapp_visibility}
                            onChange={(e) =>
                              setDetailsForm({
                                ...detailsForm,
                                whatsapp_visibility: e.target.value as any,
                              })
                            }
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-100 focus:border-amber-500 transition-all"
                          >
                            <option value="friends">Friends only</option>
                            <option value="ride_only">Ride partners only</option>
                            <option value="anyone">Anyone</option>
                            <option value="none">No one</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="bg-red-50 border-2 border-red-100 rounded-xl p-5">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        Emergency contact
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        This person will be contacted in case of an emergency during your rides.
                        <strong className="text-red-700"> Highly recommended for safety.</strong>
                      </p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact name
                          </label>
                          <input
                            type="text"
                            value={detailsForm.emergency_contact_name}
                            onChange={(e) => setDetailsForm({ ...detailsForm, emergency_contact_name: e.target.value })}
                            placeholder="e.g., Mum, Partner, John Smith"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contact phone
                          </label>
                          <input
                            type="tel"
                            value={detailsForm.emergency_contact_phone}
                            onChange={(e) => setDetailsForm({ ...detailsForm, emergency_contact_phone: e.target.value })}
                            placeholder="+44 7700 900000"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-400 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Step */}
              {step.key === 'complete' && (
                <div className="text-center py-12">
                  <div className="w-28 h-28 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-100 animate-bounce-slow">
                    <Award className="w-14 h-14 text-green-600" />
                  </div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    Welcome to the Community!
                  </h1>
                  <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
                    Your profile is complete. You're now ready to share rides with thousands of members.
                  </p>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-8 max-w-lg mx-auto">
                    <h3 className="font-semibold text-gray-900 mb-4">What's next?</h3>
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Search className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Find a ride</div>
                          <div className="text-sm text-gray-500">Browse available journeys</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Car className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Offer a ride</div>
                          <div className="text-sm text-gray-500">Share your journey with others</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-white rounded-xl p-3">
                        <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-rose-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">Connect with members</div>
                          <div className="text-sm text-gray-500">Build your carpool network</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleFinish}
                    data-testid="onboarding-finish"
                    className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold text-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg shadow-green-200"
                  >
                    Start Exploring
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Navigation */}
          {step.key !== 'welcome' && step.key !== 'complete' && (
            <div className="bg-white border-t border-gray-100 px-6 py-4 sticky bottom-0">
              <div className="max-w-2xl mx-auto flex gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(Math.max(currentStep - 1, 0))}
                  disabled={currentStep === 0}
                  className="flex-1 px-6 py-4 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>

                {step.key === 'basics' && (
                  <button
                    type="button"
                    onClick={handleBasicsSave}
                    disabled={saving}
                    data-testid="onboarding-basics-next"
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}

                {step.key === 'photo' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={uploadingPhoto || !photoPreview}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}

                {step.key === 'phone' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    disabled={!profile?.phone_verified}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}

                {step.key === 'preferences' && (
                  <button
                    type="button"
                    onClick={handlePreferencesSave}
                    disabled={saving}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}

                {step.key === 'details' && (
                  <button
                    type="button"
                    onClick={handleDetailsSave}
                    disabled={saving}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-amber-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Complete Profile
                        <Zap className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-in-out forwards;
        }
        .animate-bounce-slow {
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% {
            transform: translateY(-5%);
          }
          50% {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
