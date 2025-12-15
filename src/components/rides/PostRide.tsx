import { useState } from 'react';
import { MapPin, Calendar, Clock, Users, Car, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export default function PostRide() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    departureDate: '',
    departureTime: '',
    availableSeats: 1,
    notes: '',
    isRecurring: false,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

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
        alert('Please add a vehicle to your profile first');
        setLoading(false);
        return;
      }

      const departureDateTime = new Date(
        `${formData.departureDate}T${formData.departureTime}`
      ).toISOString();

      const { error } = await supabase.from('rides').insert([{
        driver_id: user.id,
        vehicle_id: vehicles.id,
        origin: formData.origin,
        origin_lat: 0,
        origin_lng: 0,
        destination: formData.destination,
        destination_lat: 0,
        destination_lng: 0,
        departure_time: departureDateTime,
        available_seats: formData.availableSeats,
        total_seats: formData.availableSeats,
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
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error posting ride:', error);
      alert('Failed to post ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="offer-ride" className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Offer a Ride</h2>
          <p className="text-xl text-gray-600">
            Share your journey and help others in your community
          </p>
        </div>

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            Ride posted successfully! It's now visible to other users.
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Pickup Location
              </label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="Enter starting point"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Destination
              </label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="Enter destination"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Time
                </label>
                <input
                  type="time"
                  value={formData.departureTime}
                  onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'seat' : 'seats'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional information about your ride..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              disabled={loading || !user}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              {loading ? 'Posting Ride...' : 'Post Ride'}
            </button>

            {!user && (
              <p className="text-center text-sm text-red-600">
                Please sign in to post a ride
              </p>
            )}
          </form>
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Car className="w-5 h-5 text-blue-600" />
            Driving Tips
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• Arrive at pickup points on time</li>
            <li>• Keep your vehicle clean and well-maintained</li>
            <li>• Communicate any changes to your passengers promptly</li>
            <li>• Follow all traffic laws and drive safely</li>
            <li>• Be respectful of passenger preferences</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
