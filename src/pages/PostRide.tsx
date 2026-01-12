import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, AlertCircle, CheckCircle, Repeat, MapPin, Clock, Calendar as CalendarIcon, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getUserVehicles, VehicleRow } from '../services/vehicleService';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from '../components/shared/LocationAutocomplete';
import EmailVerificationBanner from '../components/shared/EmailVerificationBanner';
import TrainlineDateTimePicker from '../components/shared/TrainlineDateTimePicker';
import RecurringPatternForm from '../components/rides/RecurringPatternForm';
import { useServiceGating } from '../hooks/useServiceGating';
import { RecurringPatternConfig, formatPatternDescription } from '../types/recurring';
import { RideType, RIDE_TYPE_LIST, getRideTypeInfo } from '../types/rideTypes';
import { analytics } from '../lib/analytics';

export default function PostRide() {
  const { user, isEmailVerified, profile } = useAuth();
  const navigate = useNavigate();
  const { checkAccess, ServiceGatingModal } = useServiceGating();
  const [hasVehicle, setHasVehicle] = useState(false);
  const [checkingVehicle, setCheckingVehicle] = useState(true);
  const [vehicleLoadError, setVehicleLoadError] = useState('');
  const [vehicles, setVehicles] = useState<VehicleRow[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleCapacity, setVehicleCapacity] = useState(4);
  const [rideType, setRideType] = useState<RideType>('daily_commute');
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    availableSeats: 1,
    notes: '',
    isRecurring: false,
    availableUntil: '', // For flexible rides
    pickupRadius: 10,
  });
  const [recurringPattern, setRecurringPattern] = useState<RecurringPatternConfig | null>(null);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [dateTime, setDateTime] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    timeType: 'depart' as 'depart' | 'arrive',
  });
  const [originCoords, setOriginCoords] = useState({ lat: 0, lng: 0 });
  const [destCoords, setDestCoords] = useState({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === selectedVehicleId) ?? vehicles[0] ?? null;

  useEffect(() => {
    checkForVehicle();
  }, [user]);

  // Update recurring based on ride type
  useEffect(() => {
    const typeInfo = getRideTypeInfo(rideType);
    setFormData(prev => ({
      ...prev,
      isRecurring: typeInfo.defaultRecurring
    }));
  }, [rideType]);

  useEffect(() => {
    if (!selectedVehicle) return;
    const passengerSeats = Math.max((selectedVehicle.capacity || 5) - 1, 1);
    setVehicleCapacity(passengerSeats);
    setFormData(prev => ({
      ...prev,
      availableSeats: Math.min(prev.availableSeats, passengerSeats),
    }));
  }, [selectedVehicle?.id, selectedVehicle?.capacity]);

  const checkForVehicle = async () => {
    if (!user) return;

    setCheckingVehicle(true);
    setVehicleLoadError('');

    try {
      const { data, error } = await getUserVehicles(user.id, { activeOnly: true });

      if (error) throw error;

      setVehicles(data);
      setHasVehicle(data.length > 0);

      const nextVehicleId =
        selectedVehicleId && data.some(vehicle => vehicle.id === selectedVehicleId)
          ? selectedVehicleId
          : data[0]?.id ?? null;

      setSelectedVehicleId(nextVehicleId);
    } catch (error) {
      console.error('Error checking vehicle:', error);
      setVehicleLoadError('Unable to load your vehicles. Please try again.');
      setVehicles([]);
      setHasVehicle(false);
      setSelectedVehicleId(null);
    } finally {
      setCheckingVehicle(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!checkAccess('post-ride')) {
      return;
    }

    if (!isEmailVerified) {
      setError('Please verify your email address before posting rides.');
      return;
    }

    if (!formData.origin.trim() || !formData.destination.trim()) {
      setError('Please provide both origin and destination.');
      return;
    }

    if (!dateTime.date || !dateTime.time) {
      setError('Please select a valid date and time for your ride.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const departure = new Date(`${dateTime.date}T${dateTime.time}`);
      if (Number.isNaN(departure.getTime())) {
        throw new Error('Invalid date or time. Please pick a valid departure time.');
      }

      let vehicleToUse = selectedVehicle;

      if (!vehicleToUse) {
        const { data, error: vehiclesError } = await getUserVehicles(user.id, { activeOnly: true });

        if (vehiclesError) throw vehiclesError;

        if (!data.length) {
          setError('Please add a vehicle to your profile first');
          setLoading(false);
          return;
        }

        vehicleToUse = data[0];
        setVehicles(data);
        setSelectedVehicleId(vehicleToUse.id);
      }

      const departureDateTime = departure.toISOString();

      const passengerSeats = Math.max((vehicleToUse.capacity || 5) - 1, 1);
      const seatsToOffer = Math.min(formData.availableSeats, passengerSeats);

      // Check if this is a recurring ride with a pattern
      if (formData.isRecurring && recurringPattern) {
        // Create recurring pattern first
        try {
          const { data: patternData, error: patternError } = await supabase
            .from('recurring_ride_patterns')
            .insert([{
              driver_id: user.id,
              vehicle_id: vehicleToUse.id,
              origin: formData.origin,
              origin_lat: originCoords.lat,
              origin_lng: originCoords.lng,
              destination: formData.destination,
              destination_lat: destCoords.lat,
              destination_lng: destCoords.lng,
              departure_time: dateTime.time,
              available_seats: seatsToOffer,
              notes: formData.notes,
              pattern_type: recurringPattern.patternType,
              days_of_week: recurringPattern.patternType === 'weekly' ? recurringPattern.daysOfWeek : null,
              day_of_month: recurringPattern.patternType === 'monthly' ? recurringPattern.dayOfMonth : null,
              start_date: recurringPattern.startDate || dateTime.date,
              end_date: recurringPattern.endType === 'date' ? recurringPattern.endDate : null,
              max_occurrences: recurringPattern.endType === 'occurrences' ? recurringPattern.maxOccurrences : null,
              is_active: true,
            }])
            .select()
            .single();

          if (patternError) {
            // Check if this is a schema cache error (table doesn't exist)
            if (patternError.message?.includes('schema cache') || patternError.code === 'PGRST204') {
              console.error('Recurring patterns table not available, falling back to single ride:', patternError);
              // Fall through to create a single ride instead
            } else {
              throw patternError;
            }
          } else if (patternData) {
            // Generate rides using RPC function
            const { error: generateError } = await supabase.rpc('generate_recurring_rides', {
              pattern_id: patternData.id,
              days_ahead: 30, // Generate rides for next 30 days
            });

            if (generateError) {
              console.error('Error generating recurring rides:', generateError);
              // Don't throw - pattern was created, rides can be generated later
            }
            
            // Skip creating single ride since recurring pattern was created
            setSuccess('Recurring ride pattern created successfully!');
            setLoading(false);
            navigate('/my-rides?tab=driving');
            return;
          }
        } catch (recurringError: any) {
          // If recurring ride creation fails with schema error, fall back to single ride
          if (recurringError?.message?.includes('schema cache') || recurringError?.code === 'PGRST204') {
            console.warn('Recurring rides feature not available, creating single ride instead');
          } else {
            throw recurringError;
          }
        }
      }
      
      // Single ride (or fallback from failed recurring ride creation)
      const { error } = await supabase.from('rides').insert([{
        driver_id: user.id,
        vehicle_id: vehicleToUse.id,
        origin: formData.origin,
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        destination: formData.destination,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        departure_time: departureDateTime,
        time_type: dateTime.timeType,
        available_seats: seatsToOffer,
        total_seats: seatsToOffer,
        notes: formData.notes,
        is_recurring: formData.isRecurring,
        ride_type: rideType,
        available_until: rideType === 'flexible' && formData.availableUntil
          ? new Date(formData.availableUntil).toISOString()
          : null,
        pickup_radius_km: formData.pickupRadius,
      }]);

      if (error) throw error;

      setSuccess(true);
      
      // Track ride creation success
      analytics.track.rideCreated({
        seats: seatsToOffer,
        is_recurring: formData.isRecurring || !!recurringPattern,
        // Distance would need to be calculated from coords - using placeholder for now
        distance_km: undefined,
      });
      
      setFormData({
        origin: '',
        destination: '',
        availableSeats: 1,
        notes: '',
        isRecurring: false,
        availableUntil: '',
        pickupRadius: 10,
      });
      setRideType('daily_commute');
      setRecurringPattern(null);
      setDateTime({
        date: new Date().toISOString().split('T')[0],
        time: '',
        timeType: 'depart',
      });

      setTimeout(() => {
        navigate('/my-rides');
      }, 2000);
    } catch (error: any) {
      console.error('Error posting ride:', error);
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'Failed to post ride. Please try again.';
      setError(message);
      
      // Track ride creation error
      analytics.track.errorStateShown({
        error_type: 'server',
        error_source: 'post_ride',
        error_code: error?.code || error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingVehicle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (vehicleLoadError) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Vehicles</h2>
          <p className="text-gray-700 mb-6">{vehicleLoadError}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={checkForVehicle}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => navigate('/profile?section=vehicles')}
              className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-colors"
            >
              Manage Vehicles
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasVehicle) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Vehicle Registered</h2>
          <p className="text-gray-700 mb-6">
            You need to add a vehicle to your profile before you can offer rides.
          </p>
          <button
            onClick={() => navigate('/profile?section=vehicles')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ServiceGatingModal />
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Post a Ride</h1>
          <p className="text-gray-600 mt-1">Share your journey with the community</p>
        </div>

        <EmailVerificationBanner action="post rides" />

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex items-center gap-3">
            <CheckCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">Ride posted successfully!</p>
              <p className="text-sm">Redirecting to your rides...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-6 h-6" />
            <p>{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ride Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                What type of ride is this?
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {RIDE_TYPE_LIST.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setRideType(type.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${rideType === type.value
                        ? `border-blue-500 ${type.bgColor} ring-2 ring-blue-200`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{type.icon}</span>
                      <span className={`font-medium ${rideType === type.value ? type.color : 'text-gray-900'}`}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{type.description}</p>
                  </button>
                ))}
              </div>
              {getRideTypeInfo(rideType).supportsRecurring && (
                <p className="mt-2 text-sm text-blue-600 flex items-center gap-1">
                  <Info className="w-4 h-4" />
                  This ride type supports recurring schedules
                </p>
              )}
            </div>

            {/* User's City Info */}
            {profile?.city && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-800">
                    Posting ride from your area: <strong>{profile.city}</strong>
                  </p>
                  <p className="text-xs text-blue-600">Riders in your area will see this ride first</p>
                </div>
              </div>
            )}

            {vehicles.length > 0 && (
              <div>
                <label htmlFor="vehicle-select" className="block text-sm font-medium text-gray-700 mb-2">
                  Vehicle
                </label>
                <select
                  id="vehicle-select"
                  value={selectedVehicleId ?? ''}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.make} {vehicle.model} • {vehicle.license_plate}
                    </option>
                  ))}
                </select>
                {selectedVehicle && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedVehicle.year} {selectedVehicle.color} • {selectedVehicle.capacity} total seats
                  </p>
                )}
              </div>
            )}

            <LocationAutocomplete
              id="origin-input"
              label="Pickup Location"
              value={formData.origin}
              onChange={(value, place) => {
                setFormData(prev => ({ ...prev, origin: value }));
                if (place?.geometry?.location) {
                  setOriginCoords({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  });
                }
              }}
              placeholder="Enter starting point"
              required
            />

            <LocationAutocomplete
              id="destination-input"
              label="Destination"
              value={formData.destination}
              onChange={(value, place) => {
                setFormData(prev => ({ ...prev, destination: value }));
                if (place?.geometry?.location) {
                  setDestCoords({
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng(),
                  });
                }
              }}
              placeholder="Enter destination"
              required
            />

            <TrainlineDateTimePicker
              value={dateTime}
              onChange={setDateTime}
              minDate={new Date().toISOString().split('T')[0]}
              label="When"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Available Seats
              </label>
              <select
                value={formData.availableSeats}
                onChange={(e) =>
                  setFormData({ ...formData, availableSeats: Number(e.target.value) })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: vehicleCapacity }, (_, i) => i + 1).map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'seat' : 'seats'}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Your vehicle has {vehicleCapacity} passenger seats available (excluding driver)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional information about your ride..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Flexible Ride Options */}
            {rideType === 'flexible' && (
              <div className="border border-teal-200 bg-teal-50 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 text-teal-800">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Flexible Ride Settings</span>
                </div>
                <p className="text-sm text-teal-700">
                  This ride will remain active until you remove it or set an end date.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Available Until (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.availableUntil}
                      onChange={(e) => setFormData({ ...formData, availableUntil: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty for indefinite availability</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Radius (km)
                    </label>
                    <select
                      value={formData.pickupRadius}
                      onChange={(e) => setFormData({ ...formData, pickupRadius: Number(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      <option value={5}>5 km - Very close</option>
                      <option value={10}>10 km - Nearby</option>
                      <option value={25}>25 km - Local area</option>
                      <option value={50}>50 km - Extended</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">How far you're willing to deviate for pickup</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recurring Ride Section - Only for types that support it */}
            {getRideTypeInfo(rideType).supportsRecurring && rideType !== 'flexible' && (
              <div className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${formData.isRecurring ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Repeat className={`w-5 h-5 ${formData.isRecurring ? 'text-blue-600' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Recurring Ride</p>
                      <p className="text-sm text-gray-500">
                        {formData.isRecurring && recurringPattern
                          ? formatPatternDescription(recurringPattern)
                          : 'Set up a repeating schedule for this ride'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {formData.isRecurring && (
                      <button
                        type="button"
                        onClick={() => setShowRecurringModal(true)}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {recurringPattern ? 'Edit' : 'Configure'}
                      </button>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isRecurring}
                        onChange={(e) => {
                          setFormData({ ...formData, isRecurring: e.target.checked });
                          if (e.target.checked && !recurringPattern) {
                            setShowRecurringModal(true);
                          }
                          if (!e.target.checked) {
                            setRecurringPattern(null);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>
                {formData.isRecurring && !recurringPattern && (
                  <p className="mt-3 text-sm text-amber-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Please configure the recurring pattern before posting
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (formData.isRecurring && !recurringPattern && rideType !== 'flexible')}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Car className="w-5 h-5" />
              {loading ? 'Posting Ride...' :
                rideType === 'flexible' ? 'Post Flexible Ride' :
                  formData.isRecurring ? 'Create Recurring Ride' :
                    `Post ${getRideTypeInfo(rideType).label}`}
            </button>
          </form>
        </div>

        <RecurringPatternForm
          isOpen={showRecurringModal}
          onClose={() => setShowRecurringModal(false)}
          onChange={(pattern) => {
            setRecurringPattern(pattern);
            if (!pattern) {
              setFormData(prev => ({ ...prev, isRecurring: false }));
            }
          }}
          initialPattern={recurringPattern || undefined}
        />
      </div>
    </>
  );
}
