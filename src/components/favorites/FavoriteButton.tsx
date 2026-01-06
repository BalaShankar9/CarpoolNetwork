import { useState, useEffect } from 'react';
import { Heart, HeartOff, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
    isDriverFavorited,
    addFavoriteDriver,
    removeFavoriteDriver,
} from '../../services/favoritesService';

interface FavoriteButtonProps {
    driverId: string;
    driverName?: string;
    size?: 'sm' | 'md' | 'lg';
    showLabel?: boolean;
    onToggle?: (isFavorite: boolean) => void;
}

export function FavoriteButton({
    driverId,
    driverName,
    size = 'md',
    showLabel = false,
    onToggle,
}: FavoriteButtonProps) {
    const { user } = useAuth();
    const [isFavorite, setIsFavorite] = useState(false);
    const [loading, setLoading] = useState(true);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        if (user && driverId) {
            checkFavoriteStatus();
        }
    }, [user, driverId]);

    const checkFavoriteStatus = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const favorited = await isDriverFavorited(user.id, driverId);
            setIsFavorite(favorited);
        } catch (err) {
            console.error('Error checking favorite status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!user || toggling) return;

        setToggling(true);
        try {
            if (isFavorite) {
                await removeFavoriteDriver(user.id, driverId);
                setIsFavorite(false);
                onToggle?.(false);
            } else {
                await addFavoriteDriver(user.id, driverId);
                setIsFavorite(true);
                onToggle?.(true);
            }
        } catch (err) {
            console.error('Error toggling favorite:', err);
        } finally {
            setToggling(false);
        }
    };

    // Don't show for own profile
    if (user?.id === driverId) {
        return null;
    }

    const sizeClasses = {
        sm: 'p-1.5',
        md: 'p-2',
        lg: 'p-3',
    };

    const iconSizes = {
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
    };

    if (loading) {
        return (
            <button
                disabled
                className={`${sizeClasses[size]} rounded-full bg-gray-100 text-gray-400`}
            >
                <Loader2 className={`${iconSizes[size]} animate-spin`} />
            </button>
        );
    }

    return (
        <button
            onClick={handleToggle}
            disabled={toggling}
            className={`
        ${sizeClasses[size]} rounded-full transition-all
        ${isFavorite
                    ? 'bg-red-100 text-red-500 hover:bg-red-200'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-400'
                }
        ${toggling ? 'opacity-50 cursor-not-allowed' : ''}
        ${showLabel ? 'flex items-center gap-2 px-3' : ''}
      `}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
            {toggling ? (
                <Loader2 className={`${iconSizes[size]} animate-spin`} />
            ) : (
                <Heart
                    className={`${iconSizes[size]} ${isFavorite ? 'fill-red-500' : ''}`}
                />
            )}
            {showLabel && (
                <span className="text-sm font-medium">
                    {isFavorite ? 'Favorited' : 'Favorite'}
                </span>
            )}
        </button>
    );
}
