// Recurring Rides Management Component
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calendar,
    Clock,
    MapPin,
    Repeat,
    Plus,
    Trash2,
    Edit,
    ToggleLeft,
    ToggleRight,
    Car,
    Users,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import { matchingService, RecurringRide } from '@/services/matchingService';
import { useAuth } from '@/contexts/AuthContext';

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sun', full: 'Sunday' },
    { value: 1, label: 'Mon', full: 'Monday' },
    { value: 2, label: 'Tue', full: 'Tuesday' },
    { value: 3, label: 'Wed', full: 'Wednesday' },
    { value: 4, label: 'Thu', full: 'Thursday' },
    { value: 5, label: 'Fri', full: 'Friday' },
    { value: 6, label: 'Sat', full: 'Saturday' },
];

export function RecurringRides() {
    const { user } = useAuth();
    const [rides, setRides] = useState<RecurringRide[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingRide, setEditingRide] = useState<RecurringRide | null>(null);

    useEffect(() => {
        if (user) {
            loadRides();
        }
    }, [user]);

    const loadRides = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await matchingService.getUserRecurringRides(user.id);
            setRides(data);
        } catch (error) {
            console.error('Failed to load recurring rides:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (ride: RecurringRide) => {
        try {
            await matchingService.updateRecurringRide(ride.id, { isActive: !ride.isActive });
            setRides((prev) =>
                prev.map((r) => (r.id === ride.id ? { ...r, isActive: !r.isActive } : r))
            );
        } catch (error) {
            console.error('Failed to toggle ride:', error);
        }
    };

    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (id: string) => {
        setDeleteConfirmId(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirmId) return;
        setDeleting(true);
        try {
            await matchingService.deleteRecurringRide(deleteConfirmId);
            setRides((prev) => prev.filter((r) => r.id !== deleteConfirmId));
        } catch (error) {
            console.error('Failed to delete ride:', error);
        } finally {
            setDeleting(false);
            setDeleteConfirmId(null);
        }
    };

    const handleEdit = (ride: RecurringRide) => {
        setEditingRide(ride);
        setShowForm(true);
    };

    const handleFormClose = () => {
        setShowForm(false);
        setEditingRide(null);
    };

    const handleFormSubmit = () => {
        loadRides();
        handleFormClose();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
            </div>
        );
    }

    return (
        <div className="p-4 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Repeat className="w-6 h-6 text-emerald-500" />
                        Recurring Rides
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Set up your regular commute for automatic matching
                    </p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add New
                </motion.button>
            </div>

            {rides.length === 0 ? (
                <EmptyState onAdd={() => setShowForm(true)} />
            ) : (
                <div className="space-y-4">
                    {rides.map((ride) => (
                        <RecurringRideCard
                            key={ride.id}
                            ride={ride}
                            onToggle={() => handleToggle(ride)}
                            onEdit={() => handleEdit(ride)}
                            onDelete={() => handleDelete(ride.id)}
                        />
                    ))}
                </div>
            )}

            <AnimatePresence>
                {showForm && (
                    <RecurringRideForm
                        editingRide={editingRide}
                        onClose={handleFormClose}
                        onSubmit={handleFormSubmit}
                    />
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                onConfirm={confirmDelete}
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

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
        >
            <Repeat className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Recurring Rides Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Set up your regular routes and let us automatically find matches for your daily commute
            </p>
            <button
                onClick={onAdd}
                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium"
            >
                <Plus className="w-5 h-5" />
                Create Your First Recurring Ride
            </button>
        </motion.div>
    );
}

function RecurringRideCard({
    ride,
    onToggle,
    onEdit,
    onDelete,
}: {
    ride: RecurringRide;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const activeDays = ride.daysOfWeek
        .sort((a, b) => a - b)
        .map((d) => DAYS_OF_WEEK.find((day) => day.value === d)?.label)
        .join(', ');

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all ${ride.isActive
                    ? 'border-emerald-500/30'
                    : 'border-gray-200 dark:border-gray-700 opacity-60'
                }`}
        >
            <div className="p-4">
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2 rounded-lg ${ride.type === 'driver'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                }`}
                        >
                            {ride.type === 'driver' ? (
                                <Car className="w-5 h-5" />
                            ) : (
                                <Users className="w-5 h-5" />
                            )}
                        </div>
                        <div>
                            <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${ride.type === 'driver'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                                    }`}
                            >
                                {ride.type === 'driver' ? 'Offering Ride' : 'Looking for Ride'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggle}
                            className={`p-1 rounded transition-colors ${ride.isActive
                                    ? 'text-emerald-500'
                                    : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {ride.isActive ? (
                                <ToggleRight className="w-8 h-8" />
                            ) : (
                                <ToggleLeft className="w-8 h-8" />
                            )}
                        </button>
                        <button
                            onClick={onEdit}
                            className="p-2 text-gray-400 hover:text-blue-500 rounded transition-colors"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onDelete}
                            className="p-2 text-gray-400 hover:text-red-500 rounded transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-emerald-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">From</p>
                            <p className="font-medium text-gray-900 dark:text-white">{ride.origin}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">To</p>
                            <p className="font-medium text-gray-900 dark:text-white">{ride.destination}</p>
                        </div>
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">
                            {formatTime(ride.departureTime)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{activeDays}</span>
                    </div>
                    {ride.autoBook && (
                        <div className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>Auto-book</span>
                        </div>
                    )}
                </div>

                {ride.matchedRides.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-sm text-emerald-600 dark:text-emerald-400">
                            ✓ {ride.matchedRides.length} rides matched this week
                        </p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function RecurringRideForm({
    editingRide,
    onClose,
    onSubmit,
}: {
    editingRide: RecurringRide | null;
    onClose: () => void;
    onSubmit: () => void;
}) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        type: editingRide?.type || 'passenger' as 'driver' | 'passenger',
        origin: editingRide?.origin || '',
        originLat: editingRide?.originLat || 0,
        originLng: editingRide?.originLng || 0,
        destination: editingRide?.destination || '',
        destinationLat: editingRide?.destinationLat || 0,
        destinationLng: editingRide?.destinationLng || 0,
        departureTime: editingRide?.departureTime || '08:00',
        daysOfWeek: editingRide?.daysOfWeek || [1, 2, 3, 4, 5], // Weekdays by default
        autoBook: editingRide?.autoBook ?? false,
    });

    const toggleDay = (day: number) => {
        setFormData((prev) => ({
            ...prev,
            daysOfWeek: prev.daysOfWeek.includes(day)
                ? prev.daysOfWeek.filter((d) => d !== day)
                : [...prev.daysOfWeek, day].sort((a, b) => a - b),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!formData.origin || !formData.destination) {
            setError('Please enter both origin and destination');
            return;
        }

        if (formData.daysOfWeek.length === 0) {
            setError('Please select at least one day');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (editingRide) {
                await matchingService.updateRecurringRide(editingRide.id, {
                    daysOfWeek: formData.daysOfWeek,
                    departureTime: formData.departureTime,
                    autoBook: formData.autoBook,
                });
            } else {
                await matchingService.createRecurringRide({
                    userId: user.id,
                    type: formData.type,
                    origin: formData.origin,
                    originLat: formData.originLat,
                    originLng: formData.originLng,
                    destination: formData.destination,
                    destinationLat: formData.destinationLat,
                    destinationLng: formData.destinationLng,
                    departureTime: formData.departureTime,
                    daysOfWeek: formData.daysOfWeek,
                    isActive: true,
                    autoBook: formData.autoBook,
                });
            }
            onSubmit();
        } catch (err) {
            setError('Failed to save recurring ride');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                        {editingRide ? 'Edit Recurring Ride' : 'New Recurring Ride'}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                I want to
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setFormData((p) => ({ ...p, type: 'passenger' }))}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${formData.type === 'passenger'
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                            : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <Users className="w-5 h-5" />
                                    <span className="text-sm font-medium">Find a Ride</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData((p) => ({ ...p, type: 'driver' }))}
                                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${formData.type === 'driver'
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                            : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <Car className="w-5 h-5" />
                                    <span className="text-sm font-medium">Offer a Ride</span>
                                </button>
                            </div>
                        </div>

                        {/* Origin */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                From
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                                <input
                                    type="text"
                                    value={formData.origin}
                                    onChange={(e) => setFormData((p) => ({ ...p, origin: e.target.value }))}
                                    placeholder="Enter pickup location"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    disabled={!!editingRide}
                                />
                            </div>
                        </div>

                        {/* Destination */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                To
                            </label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                                <input
                                    type="text"
                                    value={formData.destination}
                                    onChange={(e) => setFormData((p) => ({ ...p, destination: e.target.value }))}
                                    placeholder="Enter destination"
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    disabled={!!editingRide}
                                />
                            </div>
                        </div>

                        {/* Departure Time */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Departure Time
                            </label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="time"
                                    value={formData.departureTime}
                                    onChange={(e) => setFormData((p) => ({ ...p, departureTime: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>

                        {/* Days of Week */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Days
                            </label>
                            <div className="flex gap-2">
                                {DAYS_OF_WEEK.map((day) => (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleDay(day.value)}
                                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${formData.daysOfWeek.includes(day.value)
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Auto-book */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Auto-book matches</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Automatically confirm matching rides
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setFormData((p) => ({ ...p, autoBook: !p.autoBook }))}
                                className={formData.autoBook ? 'text-emerald-500' : 'text-gray-400'}
                            >
                                {formData.autoBook ? (
                                    <ToggleRight className="w-10 h-10" />
                                ) : (
                                    <ToggleLeft className="w-10 h-10" />
                                )}
                            </button>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : editingRide ? 'Save Changes' : 'Create'}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
}

export default RecurringRides;
