import { useState } from 'react';
import {
    X,
    Save,
    RefreshCw,
    AlertTriangle,
    Users,
    MapPin,
    FileText,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface BookingEditModalProps {
    booking: {
        id: string;
        ride_id: string;
        passenger_id: string;
        seats_requested: number;
        status: string;
        pickup_location: string | null;
        dropoff_location: string | null;
        special_requests: string | null;
        ride: {
            available_seats: number;
            price_per_seat: number | null;
        };
    };
    onClose: () => void;
    onSave: () => void;
}

export default function BookingEditModal({ booking, onClose, onSave }: BookingEditModalProps) {
    const [formData, setFormData] = useState({
        seats_requested: booking.seats_requested,
        status: booking.status,
        pickup_location: booking.pickup_location || '',
        dropoff_location: booking.dropoff_location || '',
        special_requests: booking.special_requests || '',
    });

    const [adminSection, setAdminSection] = useState({
        reason: '',
        admin_notes: '',
    });

    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // CANONICAL booking states only - 'declined' is display-only (status='cancelled' + cancellation_reason contains 'driver')
    const statusOptions = [
        { value: 'pending', label: 'Pending', color: 'orange' },
        { value: 'confirmed', label: 'Confirmed', color: 'green' },
        { value: 'completed', label: 'Completed', color: 'blue' },
        { value: 'cancelled', label: 'Cancelled', color: 'red' },
    ];

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (formData.seats_requested < 1) {
            newErrors.seats_requested = 'At least 1 seat required';
        }
        if (formData.seats_requested > booking.ride.available_seats + booking.seats_requested) {
            newErrors.seats_requested = 'Exceeds available seats on ride';
        }
        if (!adminSection.reason.trim()) {
            newErrors.reason = 'Admin reason is required for audit trail';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        setSaving(true);
        try {
            // Build the update object
            const updates: Record<string, any> = {
                seats_requested: formData.seats_requested,
                status: formData.status,
                pickup_location: formData.pickup_location || null,
                dropoff_location: formData.dropoff_location || null,
                special_requests: formData.special_requests || null,
                updated_at: new Date().toISOString(),
            };

            // Update booking
            const { error: updateError } = await supabase
                .from('ride_bookings')
                .update(updates)
                .eq('id', booking.id);

            if (updateError) throw updateError;

            // Log admin action
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
                await supabase.from('admin_action_logs').insert({
                    admin_id: userData.user.id,
                    action_type: 'booking_edit',
                    resource_type: 'booking',
                    resource_id: booking.id,
                    reason: adminSection.reason,
                    changes: {
                        old_values: {
                            seats_requested: booking.seats_requested,
                            status: booking.status,
                            pickup_location: booking.pickup_location,
                            dropoff_location: booking.dropoff_location,
                            special_requests: booking.special_requests,
                        },
                        new_values: updates,
                    },
                    metadata: {
                        admin_notes: adminSection.admin_notes || null,
                    },
                });
            }

            toast.success('Booking updated successfully');
            onSave();
        } catch (error: any) {
            console.error('Error updating booking:', error);
            toast.error(error.message || 'Failed to update booking');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[field];
                return next;
            });
        }
    };

    const totalAmount = formData.seats_requested * (booking.ride.price_per_seat || 0);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900">Edit Booking</h2>
                        <p className="text-sm text-gray-500">#{booking.id.slice(0, 8)}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Content */}
                <div className="p-6 space-y-6">
                    {/* Seats Requested */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Seats Requested *
                        </label>
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="number"
                                min="1"
                                max={booking.ride.available_seats + booking.seats_requested}
                                value={formData.seats_requested}
                                onChange={(e) => handleChange('seats_requested', parseInt(e.target.value) || 1)}
                                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.seats_requested ? 'border-red-300' : 'border-gray-300'
                                    }`}
                            />
                        </div>
                        {errors.seats_requested && (
                            <p className="text-sm text-red-600 mt-1">{errors.seats_requested}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-1">
                            New total: £{totalAmount.toFixed(2)}
                        </p>
                    </div>

                    {/* Status */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status *
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => handleChange('status', e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            {statusOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        {formData.status !== booking.status && (
                            <p className="text-sm text-orange-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Status change will notify the passenger
                            </p>
                        )}
                    </div>

                    {/* Custom Pickup */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Pickup Location
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                            <input
                                type="text"
                                value={formData.pickup_location}
                                onChange={(e) => handleChange('pickup_location', e.target.value)}
                                placeholder="Optional custom pickup point"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Custom Dropoff */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Dropoff Location
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
                            <input
                                type="text"
                                value={formData.dropoff_location}
                                onChange={(e) => handleChange('dropoff_location', e.target.value)}
                                placeholder="Optional custom dropoff point"
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Special Requests */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Special Requests
                        </label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <textarea
                                value={formData.special_requests}
                                onChange={(e) => handleChange('special_requests', e.target.value)}
                                placeholder="Any special requirements or notes"
                                rows={3}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Admin Section */}
                    <div className="pt-4 border-t border-gray-200">
                        <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Admin Section
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Edit Reason (Required) *
                                </label>
                                <textarea
                                    value={adminSection.reason}
                                    onChange={(e) => {
                                        setAdminSection(prev => ({ ...prev, reason: e.target.value }));
                                        if (errors.reason) {
                                            setErrors(prev => {
                                                const next = { ...prev };
                                                delete next.reason;
                                                return next;
                                            });
                                        }
                                    }}
                                    placeholder="Why is this booking being edited? (For audit log)"
                                    rows={2}
                                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.reason ? 'border-red-300' : 'border-gray-300'
                                        }`}
                                />
                                {errors.reason && (
                                    <p className="text-sm text-red-600 mt-1">{errors.reason}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Admin Notes (Optional)
                                </label>
                                <textarea
                                    value={adminSection.admin_notes}
                                    onChange={(e) => setAdminSection(prev => ({ ...prev, admin_notes: e.target.value }))}
                                    placeholder="Internal notes (not visible to user)"
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
            </div>
        </div>
    );
}
