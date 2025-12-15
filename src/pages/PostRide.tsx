import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, Car, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from '../components/shared/LocationAutocomplete';
import EmailVerificationBanner from '../components/shared/EmailVerificationBanner';

export default function PostRide() {
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();
  const [hasVehicle, setHasVehicle] = useState(false);
  const [checkingVehicle, setCheckingVehicle] = useState(true);
  const [vehicleCapacity, setVehicleCapacity] = useState(4);
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    availableSeats: 1,
    notes: '',
    isRecurring: false,
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

    if (!isEmailVerified) {
      setError('Please verify your email address before posting rides.');
      return;
    }

    setError('');
    setLoading(true);

    try {
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

      const departureDateTime = new Date(
        `${formData.departureDate}T${formData.departureTime}`
      ).toISOString();

      const passengerSeats = (vehicles.capacity || 5) - 1;
      const seatsToOffer = Math.min(formData.availableSeats, passengerSeats);

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
        available_seats: seatsToOffer,
        total_seats: seatsToOffer,
        notes: formData.notes,
        is_recurring: formData.isRecurring,
      }]);

      if (error) throw error;

      setSuccess(true);
      setFormData({
        origin: '',
        destination: '',
        departureDate: '',
        departureTime: '',
        availableSeats: 1,
        notes: '',
        isRecurring: false,
        timeType: 'depart',
      });

      setTimeout(() => {
        navigate('/my-rides');
      }, 2000);
    } catch (error) {
      console.error('Error posting ride:', error);
      setError('Failed to post ride. Please try again.');
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Time Type
            </label>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, timeType: 'depart' })}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.timeType === 'depart'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Depart After
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, timeType: 'arrive' })}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                  formData.timeType === 'arrive'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Arrive By
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {formData.timeType === 'depart'
                ? 'You will depart after this time'
                : 'You want to arrive by this time'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Date
              </label>
              <input
                type="date"
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" />
                {formData.timeType === 'depart' ? 'Departure Time' : 'Arrival Time'}
              </label>
              <input
                type="time"
                value={formData.departureTime}
                onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="recurring" className="text-sm text-gray-700">
              This is a recurring ride
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Car className="w-5 h-5" />
            {loading ? 'Posting Ride...' : 'Post Ride'}
          </button>
        </form>
      </div>
    </div>
  );
}
