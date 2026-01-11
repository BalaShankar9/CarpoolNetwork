import { useEffect, useMemo, useState } from 'react';
import { Calendar, Save, X, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import LocationAutocomplete from '../shared/LocationAutocomplete';
import TrainlineDateTimePicker from '../shared/TrainlineDateTimePicker';
import { notify } from '../../lib/toast';

interface EditRideModalProps {
  ride: Ride | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (ride: Ride) => void;
}

interface Ride {
  id: string;
  driver_id?: string;
  vehicle_id?: string | null;
  origin: string;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination: string;
  destination_lat?: number | null;
  destination_lng?: number | null;
  departure_time: string;
  time_type?: string | null;
  available_seats: number;
  total_seats: number;
  status: string;
  notes: string | null;
  is_recurring: boolean;
}

const parseDateValue = (value: string) => {
  const date = new Date(value);
  return date.toLocaleDateString('en-CA');
};

const parseTimeValue = (value: string) => {
  const date = new Date(value);
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function EditRideModal({ ride, isOpen, onClose, onSaved }: EditRideModalProps) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [originCoords, setOriginCoords] = useState({ lat: 0, lng: 0 });
  const [destCoords, setDestCoords] = useState({ lat: 0, lng: 0 });
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [dateTime, setDateTime] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '08:00',
    timeType: 'depart' as 'depart' | 'arrive',
  });
  const [seatCount, setSeatCount] = useState(1);
  const [bookedSeats, setBookedSeats] = useState(0);
  const [maxSeats, setMaxSeats] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ride || !isOpen) return;

    setOrigin(ride.origin);
    setDestination(ride.destination);
    setOriginCoords({ lat: ride.origin_lat || 0, lng: ride.origin_lng || 0 });
    setDestCoords({ lat: ride.destination_lat || 0, lng: ride.destination_lng || 0 });
    setNotes(ride.notes || '');
    setIsRecurring(ride.is_recurring);
    setSeatCount(ride.total_seats || ride.available_seats || 1);
    setDateTime({
      date: parseDateValue(ride.departure_time),
      time: parseTimeValue(ride.departure_time),
      timeType: (ride.time_type as 'depart' | 'arrive') || 'depart',
    });
    setError(null);

    loadSeatConstraints(ride);
  }, [ride, isOpen]);

  const loadSeatConstraints = async (targetRide: Ride) => {
    try {
      // CANONICAL booking states that reserve seats: pending, confirmed
      const { data: bookings, error: bookingError } = await supabase
        .from('ride_bookings')
        .select('seats_requested')
        .eq('ride_id', targetRide.id)
        .in('status', ['pending', 'confirmed']);

      if (bookingError) throw bookingError;

      const booked = (bookings || []).reduce((sum, row) => sum + (row.seats_requested || 0), 0);
      setBookedSeats(booked);
      setSeatCount((prev) => Math.max(prev, booked));

      let vehicleSeats = targetRide.total_seats;
      if (targetRide.vehicle_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('capacity')
          .eq('id', targetRide.vehicle_id)
          .maybeSingle();

        if (vehicle?.capacity) {
          vehicleSeats = Math.max(vehicleSeats, Math.max(vehicle.capacity - 1, 1));
        }
      }

      setMaxSeats(Math.max(vehicleSeats, booked, targetRide.total_seats));
    } catch (loadError) {
      console.error('Failed to load ride seat constraints', loadError);
      setBookedSeats(0);
      setMaxSeats(targetRide.total_seats || targetRide.available_seats || 1);
    }
  };

  const seatOptions = useMemo(() => {
    const max = maxSeats || seatCount || 1;
    const min = Math.max(bookedSeats, 1);
    const options: number[] = [];
    for (let i = min; i <= max; i += 1) {
      options.push(i);
    }
    return options.length > 0 ? options : [min];
  }, [bookedSeats, maxSeats, seatCount]);

  const handleSave = async () => {
    if (!ride) return;

    if (!origin.trim() || !destination.trim()) {
      setError('Please provide both pickup and destination.');
      return;
    }

    if (!dateTime.time) {
      setError('Please select a departure time.');
      return;
    }

    if (seatCount < bookedSeats) {
      setError(`You already have ${bookedSeats} seats booked. Increase seats to at least ${bookedSeats}.`);
      return;
    }

    setLoading(true);
    setError(null);

    const departureDateTime = new Date(`${dateTime.date}T${dateTime.time}`).toISOString();
    const updatedSeats = Math.max(seatCount, bookedSeats);
    const availableSeats = Math.max(updatedSeats - bookedSeats, 0);

    const updates = {
      origin: origin.trim(),
      origin_lat: originCoords.lat,
      origin_lng: originCoords.lng,
      destination: destination.trim(),
      destination_lat: destCoords.lat,
      destination_lng: destCoords.lng,
      departure_time: departureDateTime,
      time_type: dateTime.timeType,
      total_seats: updatedSeats,
      available_seats: availableSeats,
      notes: notes.trim() || null,
      is_recurring: isRecurring,
    };

    try {
      const { error: updateError } = await supabase
        .from('rides')
        .update(updates)
        .eq('id', ride.id);

      if (updateError) throw updateError;

      await supabase.rpc('recalculate_ride_seats', { p_ride_id: ride.id });

      const updatedRide: Ride = {
        ...ride,
        ...updates,
        available_seats: availableSeats,
        total_seats: updatedSeats,
        departure_time: departureDateTime,
      };

      notify('Ride updated successfully!', 'success');
      onSaved(updatedRide);
      onClose();
    } catch (saveError: any) {
      console.error('Failed to update ride', saveError);
      setError(saveError?.message || 'Unable to update ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !ride) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Ride</h2>
            <p className="text-sm text-gray-600">Update ride details and keep passengers informed.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700"
            aria-label="Close edit ride"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <LocationAutocomplete
            id="edit-origin"
            label="Pickup Location"
            value={origin}
            onChange={(value, place) => {
              setOrigin(value);
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
            id="edit-destination"
            label="Destination"
            value={destination}
            onChange={(value, place) => {
              setDestination(value);
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
              Seats Offered
            </label>
            <select
              value={seatCount}
              onChange={(event) => setSeatCount(Number(event.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {seatOptions.map((option) => (
                <option key={option} value={option}>
                  {option} {option === 1 ? 'seat' : 'seats'}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              {bookedSeats > 0
                ? `${bookedSeats} seat(s) already booked. Available seats will update automatically.`
                : 'No seats booked yet.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Share any updates for passengers"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(event) => setIsRecurring(event.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            This is a recurring ride
          </label>
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            Updates are visible to passengers immediately.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              type="button"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
