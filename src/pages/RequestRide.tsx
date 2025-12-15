import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Calendar, Users, Clock, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import LocationAutocomplete from '../components/shared/LocationAutocomplete';

interface LocationDetails {
  address: string;
  lat: number;
  lng: number;
}

export default function RequestRide() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [fromLocation, setFromLocation] = useState<LocationDetails | null>(null);
  const [toLocation, setToLocation] = useState<LocationDetails | null>(null);
  const [departureTime, setDepartureTime] = useState('');
  const [flexibleTime, setFlexibleTime] = useState(false);
  const [seatsNeeded, setSeatsNeeded] = useState(1);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    console.log('Location state updated:', { fromLocation, toLocation });
    if (fromLocation && toLocation && error === 'Please select both pickup and destination locations') {
      setError('');
    }
  }, [fromLocation, toLocation, error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('You must be logged in to request a ride');
      return;
    }

    if (!fromLocation || !toLocation) {
      setError('Please select both pickup and destination locations');
      return;
    }

    if (!departureTime) {
      setError('Please select a departure time');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('ride_requests')
        .insert({
          requester_id: user.id,
          from_location: fromLocation.address,
          from_lat: fromLocation.lat,
          from_lng: fromLocation.lng,
          to_location: toLocation.address,
          to_lat: toLocation.lat,
          to_lng: toLocation.lng,
          departure_time: departureTime,
          flexible_time: flexibleTime,
          seats_needed: seatsNeeded,
          notes: notes.trim(),
          status: 'pending'
        });

      if (insertError) throw insertError;

      navigate('/my-rides?tab=requests');
    } catch (err: any) {
      console.error('Error creating ride request:', err);
      setError(err.message || 'Failed to create ride request');
    } finally {
      setLoading(false);
    }
  };

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Request a Ride</h1>
        <p className="text-gray-600 mb-6">
          Tell drivers where you need to go and when. They can offer to give you a ride.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Pickup Location
            </label>
            <LocationAutocomplete
              onLocationSelect={(location) => setFromLocation(location)}
              placeholder="Where do you need to be picked up?"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-4 h-4" />
              Destination
            </label>
            <LocationAutocomplete
              onLocationSelect={(location) => setToLocation(location)}
              placeholder="Where do you want to go?"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4" />
              Departure Time
            </label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              min={minDateTime}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="flexible"
              checked={flexibleTime}
              onChange={(e) => setFlexibleTime(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="flexible" className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="w-4 h-4" />
              Flexible with time (within 1-2 hours)
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4" />
              Number of Seats Needed
            </label>
            <select
              value={seatsNeeded}
              onChange={(e) => setSeatsNeeded(parseInt(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'seat' : 'seats'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4" />
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details for potential drivers..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Posting Request...' : 'Post Ride Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
