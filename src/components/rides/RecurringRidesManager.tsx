import { useState, useEffect } from 'react';
import { Repeat, Calendar, MapPin, Clock, Edit, Trash2, Pause, Play, Plus } from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface RecurringRide {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
  available_seats: number;
  is_recurring: boolean;
  recurrence_pattern: any;
  status: string;
  estimated_distance?: number;
  estimated_duration?: number;
}

export default function RecurringRidesManager() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [recurringRides, setRecurringRides] = useState<RecurringRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      loadRecurringRides();
    }
  }, [profile?.id]);

  const loadRecurringRides = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', profile?.id)
        .eq('is_recurring', true)
        .order('departure_time', { ascending: true });

      if (error) throw error;
      setRecurringRides(data || []);
    } catch (err) {
      console.error('Error loading recurring rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const pauseRecurringRide = async (rideId: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'paused' })
        .eq('id', rideId);

      if (error) throw error;
      await loadRecurringRides();
    } catch (err) {
      console.error('Error pausing ride:', err);
    }
  };

  const resumeRecurringRide = async (rideId: string) => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status: 'active' })
        .eq('id', rideId);

      if (error) throw error;
      await loadRecurringRides();
    } catch (err) {
      console.error('Error resuming ride:', err);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const deleteRecurringRide = async (rideId: string) => {
    setDeleteConfirmId(rideId);
  };

  const confirmDeleteRide = async () => {
    if (!deleteConfirmId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('rides')
        .delete()
        .eq('id', deleteConfirmId);

      if (error) throw error;
      await loadRecurringRides();
    } catch (err) {
      console.error('Error deleting ride:', err);
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const getRecurrenceText = (pattern: any): string => {
    if (!pattern) return 'Custom schedule';

    if (pattern.type === 'daily') {
      return 'Every day';
    } else if (pattern.type === 'weekly') {
      const days = pattern.days || [];
      if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) {
        return 'Weekdays';
      } else if (days.length === 7) {
        return 'Every day';
      } else {
        const dayNames = days.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1, 3));
        return `Every ${dayNames.join(', ')}`;
      }
    } else if (pattern.type === 'monthly') {
      return `Monthly on day ${pattern.dayOfMonth || '1'}`;
    }

    return 'Custom schedule';
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-6 h-6 text-gray-900" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Recurring Rides</h3>
              <p className="text-sm text-gray-600">Manage your regular commute schedules</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/post-ride')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Recurring Ride
          </button>
        </div>
      </div>

      <div className="p-6">
        {recurringRides.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Repeat className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium">No recurring rides</p>
            <p className="text-sm mb-4">Set up regular rides for your daily commute</p>
            <button
              onClick={() => navigate('/post-ride')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create Recurring Ride
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringRides.map((ride) => (
              <div
                key={ride.id}
                className={`p-5 rounded-xl border-2 transition-all ${
                  ride.status === 'active'
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full flex-shrink-0 ${
                    ride.status === 'active' ? 'bg-blue-100' : 'bg-gray-200'
                  }`}>
                    <Repeat className={`w-6 h-6 ${
                      ride.status === 'active' ? 'text-blue-600' : 'text-gray-500'
                    }`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-gray-900">
                            {ride.origin} → {ride.destination}
                          </h4>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            ride.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {ride.status === 'active' ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{getRecurrenceText(ride.recurrence_pattern)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">{formatTime(ride.departure_time)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">
                          {ride.estimated_distance ? `${Math.round(ride.estimated_distance)} km` : 'N/A'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700">
                          {ride.estimated_duration ? `${Math.round(ride.estimated_duration / 60)} min` : 'N/A'}
                        </span>
                      </div>

                      <div className="text-sm">
                        <span className="text-gray-700 font-medium">{ride.available_seats} seats</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {ride.status === 'active' ? (
                        <button
                          onClick={() => pauseRecurringRide(ride.id)}
                          className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium flex items-center gap-1"
                        >
                          <Pause className="w-4 h-4" />
                          Pause
                        </button>
                      ) : (
                        <button
                          onClick={() => resumeRecurringRide(ride.id)}
                          className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium flex items-center gap-1"
                        >
                          <Play className="w-4 h-4" />
                          Resume
                        </button>
                      )}

                      <button
                        onClick={() => navigate(`/rides/${ride.id}`)}
                        className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>

                      <button
                        onClick={() => deleteRecurringRide(ride.id)}
                        className="px-3 py-1.5 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 bg-blue-50 border-t border-blue-200">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
            <Repeat className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">About Recurring Rides</p>
            <p className="text-blue-800">
              Set up recurring rides for your regular commutes. These rides will automatically be available
              for booking on the scheduled days, saving you time. You can pause or edit them anytime.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDeleteRide}
        title="Delete Recurring Ride"
        message="Are you sure you want to delete this recurring ride? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
