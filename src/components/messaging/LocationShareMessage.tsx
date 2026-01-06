import { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Copy, Check } from 'lucide-react';

interface LocationShareMessageProps {
    location: {
        latitude: number;
        longitude: number;
        address?: string;
    };
    label?: string;
    timestamp?: string;
    isOwnMessage?: boolean;
}

export function LocationShareMessage({
    location,
    label = 'Shared Location',
    timestamp,
    isOwnMessage = false,
}: LocationShareMessageProps) {
    const [copied, setCopied] = useState(false);

    const mapsUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;

    const copyCoordinates = async () => {
        try {
            await navigator.clipboard.writeText(`${location.latitude}, ${location.longitude}`);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const openInMaps = () => {
        window.open(mapsUrl, '_blank');
    };

    return (
        <div
            className={`max-w-xs rounded-2xl overflow-hidden ${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-white border'
                }`}
        >
            {/* Map Preview */}
            <div className="relative h-32 bg-gray-100">
                <img
                    src={`https://maps.googleapis.com/maps/api/staticmap?center=${location.latitude},${location.longitude}&zoom=15&size=300x150&markers=color:red%7C${location.latitude},${location.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`}
                    alt="Location"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        // Fallback if no API key
                        (e.target as HTMLImageElement).style.display = 'none';
                    }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-2 bg-red-500 rounded-full shadow-lg">
                        <MapPin className="h-5 w-5 text-white" />
                    </div>
                </div>
            </div>

            {/* Location Info */}
            <div className="p-3">
                <div className="flex items-start gap-2 mb-2">
                    <MapPin className={`h-4 w-4 mt-0.5 ${isOwnMessage ? 'text-blue-200' : 'text-red-500'}`} />
                    <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${isOwnMessage ? 'text-white' : 'text-gray-900'}`}>
                            {label}
                        </p>
                        {location.address && (
                            <p className={`text-xs truncate ${isOwnMessage ? 'text-blue-200' : 'text-gray-500'}`}>
                                {location.address}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={openInMaps}
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs
                     font-medium transition-colors ${isOwnMessage
                                ? 'bg-blue-500 text-white hover:bg-blue-400'
                                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                            }`}
                    >
                        <Navigation className="h-3.5 w-3.5" />
                        Open in Maps
                    </button>
                    <button
                        onClick={copyCoordinates}
                        className={`p-2 rounded-lg transition-colors ${isOwnMessage
                                ? 'bg-blue-500 text-white hover:bg-blue-400'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        title="Copy coordinates"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                </div>

                {/* Timestamp */}
                {timestamp && (
                    <p className={`text-xs mt-2 ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
                        {timestamp}
                    </p>
                )}
            </div>
        </div>
    );
}

// Share Location Button
interface ShareLocationButtonProps {
    onShare: (location: { latitude: number; longitude: number }) => void;
    disabled?: boolean;
}

export function ShareLocationButton({ onShare, disabled = false }: ShareLocationButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleShare = async () => {
        if (!('geolocation' in navigator)) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setLoading(true);
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            });

            onShare({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });
        } catch (err: any) {
            if (err.code === 1) {
                alert('Location permission denied. Please enable location access.');
            } else {
                alert('Could not get your location. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleShare}
            disabled={disabled || loading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg
               transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Share location"
        >
            {loading ? (
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            ) : (
                <MapPin className="h-5 w-5" />
            )}
        </button>
    );
}
