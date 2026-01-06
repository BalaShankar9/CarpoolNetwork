import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, AlertCircle, CheckCircle, Repeat } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from '../components/shared/LocationAutocomplete';
import EmailVerificationBanner from '../components/shared/EmailVerificationBanner';
import TrainlineDateTimePicker from '../components/shared/TrainlineDateTimePicker';
import RecurringPatternForm from '../components/rides/RecurringPatternForm';
import { useServiceGating } from '../hooks/useServiceGating';
import { RecurringPatternConfig, formatPatternDescription } from '../types/recurring';

export default function PostRide() {
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const { checkAccess, ServiceGatingModal } = useServiceGating();
  const [hasVehicle, setHasVehicle] = useState(false);
  const [checkingVehicle, setCheckingVehicle] = useState(true);
  const [vehicleCapacity, setVehicleCapacity] = useState(4);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    availableSeats: 1,
    notes: '',
    isRecurring: false,
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

  useEffect(() => {
    checkForVehicle();
  }, [user]);

  const checkForVehicle = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, capacity')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setHasVehicle(!!data);
      if (data?.capacity) {
        const passengerSeats = data.capacity - 1;
        setVehicleCapacity(passengerSeats);
        setFormData(prev => ({ ...prev, availableSeats: Math.min(prev.availableSeats, passengerSeats) }));
      }
    } catch (error) {
      console.error('Error checking vehicle:', error);
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

      const { data: vehicles } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (!vehicles) {
        setError('Please add a vehicle to your profile first');
        setLoading(false);
        return;
      }

      const departureDateTime = departure.toISOString();

      const passengerSeats = (vehicles.capacity || 5) - 1;
      const seatsToOffer = Math.min(formData.availableSeats, passengerSeats);

      // Check if this is a recurring ride with a pattern
      if (formData.isRecurring && recurringPattern) {
        // Create recurring pattern first
        const { data: patternData, error: patternError } = await supabase
          .from('recurring_ride_patterns')
          .insert([{
            driver_id: user.id,
            vehicle_id: vehicles.id,
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

        if (patternError) throw patternError;

        // Generate rides using RPC function
        if (patternData) {
          const { error: generateError } = await supabase.rpc('generate_recurring_rides', {
            pattern_id: patternData.id,
            days_ahead: 30, // Generate rides for next 30 days
          });

          if (generateError) {
            console.error('Error generating recurring rides:', generateError);
            // Don't throw - pattern was created, rides can be generated later
          }
        }
      } else {
        // Single ride
        const { error } = await supabase.from('rides').insert([{
          driver_id: user.id,
          vehicle_id: vehicles.id,
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
        }]);

        if (error) throw error;
      }

      setSuccess(true);
      setFormData({
        origin: '',
        destination: '',
        availableSeats: 1,
        notes: '',
        isRecurring: false,
      });
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
            onClick={() => navigate('/profile')}
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

            <button
              type="submit"
              disabled={loading || (formData.isRecurring && !recurringPattern)}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Car className="w-5 h-5" />
              {loading ? 'Posting Ride...' : formData.isRecurring ? 'Create Recurring Ride' : 'Post Ride'}
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
