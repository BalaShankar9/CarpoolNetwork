import { useState, useEffect } from 'react';
import {
    X,
    Save,
    MapPin,
    Calendar,
    Clock,
    Users,
    DollarSign,
    FileText,
    AlertTriangle,
    RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface RideEditModalProps {
    ride: {
        id: string;
        origin: string;
        origin_lat: number | null;
        origin_lng: number | null;
        destination: string;
        destination_lat: number | null;
        destination_lng: number | null;
        departure_time: string;
        available_seats: number;
        total_seats: number;
        price_per_seat: number | null;
        status: string;
        notes: string | null;
    };
    onClose: () => void;
    onSaved: () => void;
}

export default function RideEditModal({ ride, onClose, onSaved }: RideEditModalProps) {
    const [formData, setFormData] = useState({
        origin: ride.origin,
        origin_lat: ride.origin_lat?.toString() || '',
        origin_lng: ride.origin_lng?.toString() || '',
        destination: ride.destination,
        destination_lat: ride.destination_lat?.toString() || '',
        destination_lng: ride.destination_lng?.toString() || '',
        departure_date: ride.departure_time.split('T')[0],
        departure_time: ride.departure_time.split('T')[1]?.slice(0, 5) || '09:00',
        available_seats: ride.available_seats.toString(),
        total_seats: ride.total_seats.toString(),
        price_per_seat: ride.price_per_seat?.toString() || '',
        status: ride.status,
        notes: ride.notes || '',
    });

    const [editReason, setEditReason] = useState('');
    const [adminNotes, setAdminNotes] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.origin.trim()) {
            newErrors.origin = 'Origin is required';
        }
        if (!formData.destination.trim()) {
            newErrors.destination = 'Destination is required';
        }
        if (!formData.departure_date) {
            newErrors.departure_date = 'Departure date is required';
        }
        if (!formData.departure_time) {
            newErrors.departure_time = 'Departure time is required';
        }
        if (!formData.total_seats || parseInt(formData.total_seats) < 1) {
            newErrors.total_seats = 'Total seats must be at least 1';
        }
        if (parseInt(formData.available_seats) > parseInt(formData.total_seats)) {
            newErrors.available_seats = 'Available seats cannot exceed total seats';
        }
        if (parseInt(formData.available_seats) < 0) {
            newErrors.available_seats = 'Available seats cannot be negative';
        }
        if (!editReason.trim()) {
            newErrors.editReason = 'Edit reason is required for audit log';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.warning('Please fix the errors before saving');
            return;
        }

        setSaving(true);

        try {
            const departureTime = `${formData.departure_date}T${formData.departure_time}:00`;

            const changes = {
                origin: formData.origin,
                origin_lat: formData.origin_lat ? parseFloat(formData.origin_lat) : null,
                origin_lng: formData.origin_lng ? parseFloat(formData.origin_lng) : null,
                destination: formData.destination,
                destination_lat: formData.destination_lat ? parseFloat(formData.destination_lat) : null,
                destination_lng: formData.destination_lng ? parseFloat(formData.destination_lng) : null,
                departure_time: departureTime,
                available_seats: parseInt(formData.available_seats),
                total_seats: parseInt(formData.total_seats),
                price_per_seat: formData.price_per_seat ? parseFloat(formData.price_per_seat) : null,
                status: formData.status,
                notes: formData.notes || null,
            };

            const { error } = await supabase.rpc('admin_edit_ride', {
                p_ride_id: ride.id,
                p_changes: changes,
                p_reason: editReason + (adminNotes ? ` | Admin notes: ${adminNotes}` : ''),
            });

            if (error) throw error;

            toast.success('Ride updated successfully');
            onSaved();
        } catch (error: any) {
            console.error('Error updating ride:', error);
            toast.error(error.message || 'Failed to update ride');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-2xl w-full my-8">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Ride</h2>
                        <p className="text-sm text-gray-500">#{ride.id.slice(0, 8)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Route Information */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            Route Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Origin */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Origin *
                                </label>
                                <input
                                    type="text"
                                    value={formData.origin}
                                    onChange={(e) => handleChange('origin', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.origin ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter origin location"
                                />
                                {errors.origin && <p className="text-xs text-red-500 mt-1">{errors.origin}</p>}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={formData.origin_lat}
                                        onChange={(e) => handleChange('origin_lat', e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        placeholder="Latitude"
                                    />
                                    <input
                                        type="text"
                                        value={formData.origin_lng}
                                        onChange={(e) => handleChange('origin_lng', e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        placeholder="Longitude"
                                    />
                                </div>
                            </div>

                            {/* Destination */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Destination *
                                </label>
                                <input
                                    type="text"
                                    value={formData.destination}
                                    onChange={(e) => handleChange('destination', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.destination ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="Enter destination"
                                />
                                {errors.destination && <p className="text-xs text-red-500 mt-1">{errors.destination}</p>}
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <input
                                        type="text"
                                        value={formData.destination_lat}
                                        onChange={(e) => handleChange('destination_lat', e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        placeholder="Latitude"
                                    />
                                    <input
                                        type="text"
                                        value={formData.destination_lng}
                                        onChange={(e) => handleChange('destination_lng', e.target.value)}
                                        className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                        placeholder="Longitude"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date & Time */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            Date & Time
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Departure Date *
                                </label>
                                <input
                                    type="date"
                                    value={formData.departure_date}
                                    onChange={(e) => handleChange('departure_date', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.departure_date ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.departure_date && <p className="text-xs text-red-500 mt-1">{errors.departure_date}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Departure Time *
                                </label>
                                <input
                                    type="time"
                                    value={formData.departure_time}
                                    onChange={(e) => handleChange('departure_time', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.departure_time ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.departure_time && <p className="text-xs text-red-500 mt-1">{errors.departure_time}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Capacity & Pricing */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            Capacity & Pricing
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Total Seats *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.total_seats}
                                    onChange={(e) => handleChange('total_seats', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.total_seats ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.total_seats && <p className="text-xs text-red-500 mt-1">{errors.total_seats}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Available Seats
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={formData.available_seats}
                                    onChange={(e) => handleChange('available_seats', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.available_seats ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.available_seats && <p className="text-xs text-red-500 mt-1">{errors.available_seats}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Price per Seat (£)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.price_per_seat}
                                    onChange={(e) => handleChange('price_per_seat', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
                        <select
                            value={formData.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="active">Active</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                        {formData.status !== ride.status && (
                            <div className="flex items-center gap-2 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                <AlertTriangle className="w-4 h-4" />
                                Changing status may trigger notifications to passengers
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            Notes
                        </h3>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ride notes visible to passengers..."
                        />
                    </div>

                    {/* Admin Section */}
                    <div className="border-t border-gray-200 pt-6">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            Admin Section (Required)
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Edit Reason * <span className="text-gray-400">(for audit log)</span>
                                </label>
                                <input
                                    type="text"
                                    value={editReason}
                                    onChange={(e) => {
                                        setEditReason(e.target.value);
                                        if (errors.editReason) setErrors(prev => ({ ...prev, editReason: '' }));
                                    }}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.editReason ? 'border-red-500' : 'border-gray-300'}`}
                                    placeholder="e.g., User requested change via support ticket #123"
                                />
                                {errors.editReason && <p className="text-xs text-red-500 mt-1">{errors.editReason}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Internal Admin Notes <span className="text-gray-400">(optional)</span>
                                </label>
                                <textarea
                                    value={adminNotes}
                                    onChange={(e) => setAdminNotes(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="Internal notes (not visible to users)..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
