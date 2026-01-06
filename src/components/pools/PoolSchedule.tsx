import React, { useState } from 'react';
import {
    Calendar,
    Clock,
    Plus,
    Trash2,
    Car,
    User,
    Check
} from 'lucide-react';
import type { PoolScheduleSlot, PoolMember } from '../../services/poolService';

interface PoolScheduleProps {
    schedule: PoolScheduleSlot[];
    members: PoolMember[];
    currentUserId: string;
    isAdmin: boolean;
    onAddSlot?: (slot: { day_of_week: number; departure_time: string; is_recurring: boolean }) => Promise<void>;
    onAssignDriver?: (slotId: string, driverId: string) => Promise<void>;
    onRemoveSlot?: (slotId: string) => Promise<void>;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const PoolSchedule: React.FC<PoolScheduleProps> = ({
    schedule,
    members,
    currentUserId,
    isAdmin,
    onAddSlot,
    onAssignDriver,
    onRemoveSlot,
}) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [newSlot, setNewSlot] = useState({
        day_of_week: 1,
        departure_time: '08:00',
        is_recurring: true,
    });
    const [loading, setLoading] = useState<string | null>(null);

    const drivers = members.filter(m => m.is_driver);

    // Group schedule by day
    const scheduleByDay = DAYS.map((_, dayIndex) => ({
        day: dayIndex,
        slots: schedule
            .filter(s => s.day_of_week === dayIndex)
            .sort((a, b) => a.departure_time.localeCompare(b.departure_time)),
    }));

    const handleAddSlot = async () => {
        if (!onAddSlot) return;
        setLoading('add');
        try {
            await onAddSlot(newSlot);
            setShowAddForm(false);
            setNewSlot({
                day_of_week: 1,
                departure_time: '08:00',
                is_recurring: true,
            });
        } finally {
            setLoading(null);
        }
    };

    const handleAssignDriver = async (slotId: string, driverId: string) => {
        if (!onAssignDriver) return;
        setLoading(slotId);
        try {
            await onAssignDriver(slotId, driverId);
        } finally {
            setLoading(null);
        }
    };

    const getDriverInfo = (driverId: string | undefined) => {
        if (!driverId) return null;
        const member = members.find(m => m.user_id === driverId);
        return member?.user;
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    Weekly Schedule
                </h3>
                {isAdmin && onAddSlot && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        <Plus className="w-4 h-4" />
                        Add Time Slot
                    </button>
                )}
            </div>

            {/* Add Slot Form */}
            {showAddForm && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Day
                            </label>
                            <select
                                value={newSlot.day_of_week}
                                onChange={e => setNewSlot(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                {DAYS.map((day, i) => (
                                    <option key={i} value={i}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Time
                            </label>
                            <input
                                type="time"
                                value={newSlot.departure_time}
                                onChange={e => setNewSlot(prev => ({ ...prev, departure_time: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <label className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={newSlot.is_recurring}
                            onChange={e => setNewSlot(prev => ({ ...prev, is_recurring: e.target.checked }))}
                            className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Recurring every week
                        </span>
                    </label>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSlot}
                            disabled={loading === 'add'}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                            {loading === 'add' ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Plus className="w-4 h-4" />
                            )}
                            Add
                        </button>
                    </div>
                </div>
            )}

            {/* Schedule Grid */}
            <div className="space-y-2">
                {scheduleByDay.map(({ day, slots }) => (
                    slots.length > 0 && (
                        <div
                            key={day}
                            className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                        >
                            <div className="font-medium text-gray-900 dark:text-white mb-2">
                                {DAYS[day]}
                            </div>

                            <div className="space-y-2">
                                {slots.map(slot => {
                                    const driver = getDriverInfo(slot.driver_id);

                                    return (
                                        <div
                                            key={slot.id}
                                            className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-600"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                    <Clock className="w-4 h-4" />
                                                    <span className="font-mono">{slot.departure_time}</span>
                                                </div>

                                                {driver ? (
                                                    <div className="flex items-center gap-2">
                                                        <img
                                                            src={driver.profile_photo_url || driver.avatar_url || '/default-avatar.png'}
                                                            alt={driver.full_name}
                                                            className="w-6 h-6 rounded-full object-cover"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">
                                                            {driver.full_name}
                                                        </span>
                                                        {slot.driver_id === currentUserId && (
                                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                                                                You
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                        <User className="w-4 h-4" />
                                                        No driver assigned
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {/* Volunteer to drive */}
                                                {!slot.driver_id && drivers.some(d => d.user_id === currentUserId) && onAssignDriver && (
                                                    <button
                                                        onClick={() => handleAssignDriver(slot.id, currentUserId)}
                                                        disabled={loading === slot.id}
                                                        className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1"
                                                    >
                                                        {loading === slot.id ? (
                                                            <div className="w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Car className="w-3 h-3" />
                                                                I'll drive
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {/* Admin assign driver */}
                                                {isAdmin && onAssignDriver && (
                                                    <select
                                                        value={slot.driver_id || ''}
                                                        onChange={e => handleAssignDriver(slot.id, e.target.value)}
                                                        disabled={loading === slot.id}
                                                        className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                    >
                                                        <option value="">Unassigned</option>
                                                        {drivers.map(d => (
                                                            <option key={d.user_id} value={d.user_id}>
                                                                {d.user?.full_name || 'Driver'}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* Delete slot */}
                                                {isAdmin && onRemoveSlot && (
                                                    <button
                                                        onClick={() => onRemoveSlot(slot.id)}
                                                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                ))}

                {schedule.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No schedule set up yet</p>
                        {isAdmin && (
                            <p className="text-sm mt-1">Add time slots to create a recurring schedule</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

interface PoolScheduleCompactProps {
    schedule: PoolScheduleSlot[];
}

export const PoolScheduleCompact: React.FC<PoolScheduleCompactProps> = ({ schedule }) => {
    // Group by day
    const dayTimes: Record<number, string[]> = {};
    schedule.forEach(slot => {
        if (!dayTimes[slot.day_of_week]) {
            dayTimes[slot.day_of_week] = [];
        }
        dayTimes[slot.day_of_week].push(slot.departure_time);
    });

    return (
        <div className="flex flex-wrap gap-1">
            {Object.entries(dayTimes).map(([day, times]) => (
                <div
                    key={day}
                    className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded flex items-center gap-1"
                >
                    <span className="font-medium">{DAYS_SHORT[parseInt(day)]}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                        {times.join(', ')}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default PoolSchedule;
