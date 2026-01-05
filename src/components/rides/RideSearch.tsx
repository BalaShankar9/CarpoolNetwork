import { useState } from 'react';
import { Search, MapPin, Calendar, Users, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { fetchPublicProfilesByIds, PublicProfile } from '../../services/publicProfiles';
import type { Database } from '../../lib/database.types';

type Ride = Database['public']['Tables']['rides']['Row'] & {
  driver_id: string;
  driver: PublicProfile | null;
  vehicle: Database['public']['Tables']['vehicles']['Row'];
};

export default function RideSearch() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [seats, setSeats] = useState(1);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('rides')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .eq('status', 'active')
        .gte('available_seats', seats)
        .gte('departure_time', date ? new Date(date).toISOString() : new Date().toISOString())
        .order('departure_time', { ascending: true })
        .limit(20);

      if (error) throw error;
      const ridesData = (data || []) as Ride[];
      const driversById = await fetchPublicProfilesByIds(ridesData.map((ride) => ride.driver_id));
      const ridesWithDrivers = ridesData.map((ride) => ({
        ...ride,
        driver: driversById[ride.driver_id] || null,
      }));
      setRides(ridesWithDrivers);
    } catch (error) {
      console.error('Error searching rides:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <section id="find-ride" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Find Your Perfect Ride</h2>
          <p className="text-xl text-gray-600">
            Search for available rides in your community
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  From
                </label>
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="Enter pickup location"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  To
                </label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Enter destination"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Seats Needed
                </label>
                <select
                  value={seats}
                  onChange={(e) => setSeats(Number(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4].map((num) => (
                    <option key={num} value={num}>
                      {num} {num === 1 ? 'seat' : 'seats'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Search className="w-5 h-5" />
                  {loading ? 'Searching...' : 'Search'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Filter className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-4">Additional Filters</p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-700">Recurring rides only</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-700">Verified drivers only</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="rounded" />
                      <span className="text-sm text-gray-700">Pets allowed</span>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="space-y-4">
          {rides.length === 0 && !loading && (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-600">
                No rides found. Try adjusting your search criteria or post your own ride!
              </p>
            </div>
          )}

          {rides.map((ride) => (
            <div
              key={ride.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">
                      {(ride.driver?.full_name || 'D').charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{ride.driver?.full_name || 'Driver'}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        ⭐ {(ride.driver?.average_rating || 0).toFixed(1)}
                      </span>
                      <span>•</span>
                      <span>{ride.driver?.total_rides_offered || 0} rides</span>
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">{ride.origin}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium">{ride.destination}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDateTime(ride.departure_time)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {ride.available_seats} seats available
                    </span>
                    {ride.vehicle && (
                      <span>
                        {ride.vehicle.year} {ride.vehicle.make} {ride.vehicle.model}
                      </span>
                    )}
                  </div>
                  {ride.notes && (
                    <p className="text-sm text-gray-600 mt-2">{ride.notes}</p>
                  )}
                </div>

                <div className="flex md:flex-col gap-2">
                  <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                    Request Ride
                  </button>
                  <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
