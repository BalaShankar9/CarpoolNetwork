import { useState } from 'react';
import {
    MapPin,
    Navigation,
    Star,
    Edit2,
    Trash2,
    MoreVertical,
    Clock,
    Calendar,
    Search,
    X,
} from 'lucide-react';
import { SavedRoute, updateSavedRoute, deleteSavedRoute } from '../../services/favoritesService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface SavedRouteCardProps {
    route: SavedRoute;
    onDelete?: () => void;
    onUpdate?: () => void;
    onQuickSearch?: (route: SavedRoute) => void;
}

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function SavedRouteCard({ route, onDelete, onUpdate, onQuickSearch }: SavedRouteCardProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [name, setName] = useState(route.name);
    const [preferredTime, setPreferredTime] = useState(route.preferred_departure_time || '');
    const [preferredDays, setPreferredDays] = useState<string[]>(route.preferred_days || []);
    const [isDefault, setIsDefault] = useState(route.is_default);
    const [saving, setSaving] = useState(false);

    const handleDelete = async () => {
        if (!confirm('Delete this saved route?')) return;

        try {
            await deleteSavedRoute(route.id);
            onDelete?.();
        } catch (err) {
            console.error('Error deleting route:', err);
        }
        setShowMenu(false);
    };

    const handleEdit = async () => {
        if (!user) return;

        setSaving(true);
        try {
            await updateSavedRoute(route.id, user.id, {
                name,
                preferred_departure_time: preferredTime || undefined,
                preferred_days: preferredDays.length > 0 ? preferredDays : undefined,
                is_default: isDefault,
            });
            setShowEditModal(false);
            onUpdate?.();
        } catch (err) {
            console.error('Error updating route:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSearch = () => {
        if (onQuickSearch) {
            onQuickSearch(route);
        } else {
            // Navigate to find rides with route pre-filled
            const params = new URLSearchParams({
                origin: route.origin,
                destination: route.destination,
            });
            navigate(`/find-rides?${params.toString()}`);
        }
    };

    const toggleDay = (day: string) => {
        setPreferredDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    return (
        <>
            <div className="bg-white rounded-xl border p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {route.is_default && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-500" />
                                Default
                            </span>
                        )}
                        <h3 className="font-medium text-gray-900">{route.name}</h3>
                    </div>

                    {/* Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <MoreVertical className="h-5 w-5 text-gray-400" />
                        </button>

                        {showMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-8 z-20 bg-white border rounded-lg shadow-lg py-1 w-40">
                                    <button
                                        onClick={() => {
                                            setShowEditModal(true);
                                            setShowMenu(false);
                                        }}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50
                             flex items-center gap-2"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        Edit Route
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50
                             flex items-center gap-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Route Display */}
                <div className="space-y-2 mb-3">
                    <div className="flex items-start gap-2">
                        <div className="w-3 h-3 mt-1.5 bg-green-500 rounded-full" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500">From</p>
                            <p className="text-gray-900 truncate">{route.origin}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-3 h-3 mt-1.5 bg-red-500 rounded-full" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-500">To</p>
                            <p className="text-gray-900 truncate">{route.destination}</p>
                        </div>
                    </div>
                </div>

                {/* Preferences */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {route.preferred_departure_time && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                            <Clock className="h-3 w-3" />
                            {route.preferred_departure_time}
                        </span>
                    )}
                    {route.preferred_days && route.preferred_days.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                            <Calendar className="h-3 w-3" />
                            {route.preferred_days.length === 7
                                ? 'Daily'
                                : route.preferred_days.join(', ')}
                        </span>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                    <span>Used {route.use_count} times</span>
                    {route.last_used_at && (
                        <span>Last: {new Date(route.last_used_at).toLocaleDateString()}</span>
                    )}
                </div>

                {/* Action Button */}
                <button
                    onClick={handleSearch}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium
                   hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
                >
                    <Search className="h-4 w-4" />
                    Search Rides
                </button>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Route</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Route Name
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g., Daily Commute"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Preferred Departure Time
                                </label>
                                <input
                                    type="time"
                                    value={preferredTime}
                                    onChange={e => setPreferredTime(e.target.value)}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Preferred Days
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {DAYS_SHORT.map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${preferredDays.includes(day)
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={e => setIsDefault(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-2">
                                    <Star className="h-4 w-4 text-yellow-500" />
                                    <span className="text-sm text-gray-700">Set as default route</span>
                                </div>
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 p-4 border-t">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={saving || !name.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                         disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
