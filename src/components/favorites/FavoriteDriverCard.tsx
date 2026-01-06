import { useState } from 'react';
import {
    Heart,
    Star,
    Car,
    Edit2,
    Trash2,
    MoreVertical,
    Calendar,
    X,
} from 'lucide-react';
import { FavoriteDriver, updateFavoriteDriver, removeFavoriteDriver } from '../../services/favoritesService';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface FavoriteDriverCardProps {
    favorite: FavoriteDriver;
    onRemove?: () => void;
    onUpdate?: () => void;
}

export function FavoriteDriverCard({ favorite, onRemove, onUpdate }: FavoriteDriverCardProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [nickname, setNickname] = useState(favorite.nickname || '');
    const [notes, setNotes] = useState(favorite.notes || '');
    const [saving, setSaving] = useState(false);

    const driver = favorite.driver;
    const displayName = favorite.nickname || driver?.full_name || 'Unknown Driver';
    const avatarUrl = driver?.profile_photo_url || driver?.avatar_url;

    const handleRemove = async () => {
        if (!user) return;
        if (!confirm('Remove this driver from favorites?')) return;

        try {
            await removeFavoriteDriver(user.id, favorite.driver_id);
            onRemove?.();
        } catch (err) {
            console.error('Error removing favorite:', err);
        }
        setShowMenu(false);
    };

    const handleEdit = async () => {
        setSaving(true);
        try {
            await updateFavoriteDriver(favorite.id, { nickname, notes });
            setShowEditModal(false);
            onUpdate?.();
        } catch (err) {
            console.error('Error updating favorite:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleFindRides = () => {
        // Navigate to find rides with driver filter
        navigate(`/find-rides?driver=${favorite.driver_id}`);
    };

    return (
        <>
            <div className="bg-white rounded-xl border p-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Car className="h-6 w-6" />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 p-1 bg-red-100 rounded-full">
                            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 truncate">{displayName}</h3>
                                {favorite.nickname && driver?.full_name && (
                                    <p className="text-sm text-gray-500">{driver.full_name}</p>
                                )}
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
                                                Edit Details
                                            </button>
                                            <button
                                                onClick={handleRemove}
                                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50
                                 flex items-center gap-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Remove
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-2">
                            {driver?.average_rating && (
                                <div className="flex items-center gap-1 text-sm">
                                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                    <span className="text-gray-700">{driver.average_rating.toFixed(1)}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Car className="h-4 w-4" />
                                <span>{favorite.ride_count} rides together</span>
                            </div>
                        </div>

                        {/* Notes */}
                        {favorite.notes && (
                            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{favorite.notes}</p>
                        )}

                        {/* Last ride */}
                        {favorite.last_ride_at && (
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Last ride: {new Date(favorite.last_ride_at).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <button
                    onClick={handleFindRides}
                    className="w-full mt-4 py-2 bg-blue-50 text-blue-600 rounded-lg font-medium
                   hover:bg-blue-100 transition-colors text-sm"
                >
                    Find Their Rides
                </button>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold text-gray-900">Edit Favorite</h2>
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
                                    Nickname (optional)
                                </label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={e => setNickname(e.target.value)}
                                    placeholder={driver?.full_name || 'Enter nickname'}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Add notes about this driver..."
                                    rows={3}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>
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
                                disabled={saving}
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
