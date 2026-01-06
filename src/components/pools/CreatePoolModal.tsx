import React, { useState } from 'react';
import { X, Users, MapPin, Calendar, Clock, Lock, Globe, Plus } from 'lucide-react';
import type { CarpoolPool } from '../../services/poolService';

interface CreatePoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (pool: Omit<CarpoolPool, 'id' | 'created_by' | 'created_at' | 'invite_code'>) => Promise<void>;
}

const DAYS = [
    { value: '0', label: 'Sun' },
    { value: '1', label: 'Mon' },
    { value: '2', label: 'Tue' },
    { value: '3', label: 'Wed' },
    { value: '4', label: 'Thu' },
    { value: '5', label: 'Fri' },
    { value: '6', label: 'Sat' },
];

export const CreatePoolModal: React.FC<CreatePoolModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
}) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        origin_area: '',
        destination_area: '',
        schedule_type: 'weekdays' as 'daily' | 'weekdays' | 'custom',
        preferred_time: '08:00',
        preferred_days: ['1', '2', '3', '4', '5'],
        max_members: 10,
        is_private: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onSubmit({
                name: formData.name,
                description: formData.description || undefined,
                origin_area: formData.origin_area,
                destination_area: formData.destination_area,
                schedule_type: formData.schedule_type,
                preferred_time: formData.preferred_time,
                preferred_days: formData.schedule_type === 'custom' ? formData.preferred_days : undefined,
                max_members: formData.max_members,
                is_private: formData.is_private,
            });
            onClose();
            // Reset form
            setFormData({
                name: '',
                description: '',
                origin_area: '',
                destination_area: '',
                schedule_type: 'weekdays',
                preferred_time: '08:00',
                preferred_days: ['1', '2', '3', '4', '5'],
                max_members: 10,
                is_private: false,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create pool');
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            preferred_days: prev.preferred_days.includes(day)
                ? prev.preferred_days.filter(d => d !== day)
                : [...prev.preferred_days, day].sort(),
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                            <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Create Carpool Pool
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Start a recurring carpool group
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Pool Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Pool Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g., Downtown Commuters"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="What's this pool about?"
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        />
                    </div>

                    {/* Route */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <MapPin className="w-4 h-4 inline mr-1 text-green-500" />
                                Origin Area *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.origin_area}
                                onChange={e => setFormData(prev => ({ ...prev, origin_area: e.target.value }))}
                                placeholder="e.g., North Side"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                <MapPin className="w-4 h-4 inline mr-1 text-red-500" />
                                Destination Area *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.destination_area}
                                onChange={e => setFormData(prev => ({ ...prev, destination_area: e.target.value }))}
                                placeholder="e.g., Business District"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Schedule Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Schedule
                        </label>
                        <div className="flex gap-2">
                            {(['daily', 'weekdays', 'custom'] as const).map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, schedule_type: type }))}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${formData.schedule_type === type
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {type === 'daily' ? 'Daily' : type === 'weekdays' ? 'Weekdays' : 'Custom'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Days */}
                    {formData.schedule_type === 'custom' && (
                        <div className="flex flex-wrap gap-2">
                            {DAYS.map(day => (
                                <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleDay(day.value)}
                                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${formData.preferred_days.includes(day.value)
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Preferred Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Preferred Departure Time
                        </label>
                        <input
                            type="time"
                            value={formData.preferred_time}
                            onChange={e => setFormData(prev => ({ ...prev, preferred_time: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Max Members */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            <Users className="w-4 h-4 inline mr-1" />
                            Maximum Members
                        </label>
                        <input
                            type="number"
                            min={2}
                            max={50}
                            value={formData.max_members}
                            onChange={e => setFormData(prev => ({ ...prev, max_members: parseInt(e.target.value) || 10 }))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Privacy */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center gap-2">
                            {formData.is_private ? (
                                <Lock className="w-5 h-5 text-amber-500" />
                            ) : (
                                <Globe className="w-5 h-5 text-green-500" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formData.is_private ? 'Private Pool' : 'Public Pool'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formData.is_private
                                        ? 'Members need invite code to join'
                                        : 'Anyone can find and join'}
                                </p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.is_private}
                                onChange={e => setFormData(prev => ({ ...prev, is_private: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" />
                        </label>
                    </div>

                    {/* Submit */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Create Pool
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreatePoolModal;
