import { useState } from 'react';
import {
    Share2,
    Copy,
    Check,
    MessageCircle,
    Mail,
    Users,
    Link,
    Clock,
    X,
    Shield,
} from 'lucide-react';
import { createTripShare } from '../../services/safetyService';
import { useAuth } from '../../contexts/AuthContext';

interface TripShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    rideId: string;
    bookingId?: string;
    rideDetails: {
        origin: string;
        destination: string;
        departureTime: string;
        driverName?: string;
    };
}

export function TripShareModal({
    isOpen,
    onClose,
    rideId,
    bookingId,
    rideDetails,
}: TripShareModalProps) {
    const { user } = useAuth();
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const generateShareLink = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const tripShare = await createTripShare(rideId, user.id, bookingId);
            const link = `${window.location.origin}/trip/${tripShare.share_token}`;
            setShareLink(link);
        } catch (err: any) {
            setError(err.message || 'Failed to create share link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (!shareLink) return;

        try {
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shareLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareViaWhatsApp = () => {
        if (!shareLink) return;
        const message = encodeURIComponent(
            `I'm sharing my trip with you:\n` +
            `🚗 From: ${rideDetails.origin}\n` +
            `📍 To: ${rideDetails.destination}\n` +
            `🕐 Departure: ${new Date(rideDetails.departureTime).toLocaleString()}\n\n` +
            `Track my trip here: ${shareLink}`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const shareViaSMS = () => {
        if (!shareLink) return;
        const message = encodeURIComponent(
            `Track my carpool trip: ${rideDetails.origin} to ${rideDetails.destination}. ` +
            `Departure: ${new Date(rideDetails.departureTime).toLocaleString()}. ` +
            `Link: ${shareLink}`
        );
        window.open(`sms:?body=${message}`, '_blank');
    };

    const shareViaEmail = () => {
        if (!shareLink) return;
        const subject = encodeURIComponent('My Trip Details - Track My Journey');
        const body = encodeURIComponent(
            `Hi,\n\nI'm sharing my trip details with you for safety:\n\n` +
            `From: ${rideDetails.origin}\n` +
            `To: ${rideDetails.destination}\n` +
            `Departure: ${new Date(rideDetails.departureTime).toLocaleString()}\n` +
            (rideDetails.driverName ? `Driver: ${rideDetails.driverName}\n` : '') +
            `\nYou can track my trip in real-time here:\n${shareLink}\n\n` +
            `This link will expire in 24 hours.\n\n` +
            `Best,\n${user?.user_metadata?.full_name || 'Your friend'}`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    };

    const shareNative = async () => {
        if (!shareLink || !navigator.share) return;

        try {
            await navigator.share({
                title: 'Track My Trip',
                text: `Track my carpool from ${rideDetails.origin} to ${rideDetails.destination}`,
                url: shareLink,
            });
        } catch (err) {
            // User cancelled or error
            console.log('Native share cancelled or failed');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Share2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Share Trip</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Trip Summary */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <div className="space-y-2">
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 mt-2 bg-green-500 rounded-full" />
                                <div>
                                    <p className="text-sm text-gray-500">From</p>
                                    <p className="font-medium text-gray-900 line-clamp-1">
                                        {rideDetails.origin}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-2 h-2 mt-2 bg-red-500 rounded-full" />
                                <div>
                                    <p className="text-sm text-gray-500">To</p>
                                    <p className="font-medium text-gray-900 line-clamp-1">
                                        {rideDetails.destination}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    {new Date(rideDetails.departureTime).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Share Link Generation */}
                    {!shareLink ? (
                        <button
                            onClick={generateShareLink}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium
                       hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                            ) : (
                                <>
                                    <Link className="h-5 w-5" />
                                    Generate Share Link
                                </>
                            )}
                        </button>
                    ) : (
                        <>
                            {/* Share Link Display */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={shareLink}
                                    readOnly
                                    className="flex-1 px-4 py-2 bg-gray-100 border rounded-lg text-sm
                           text-gray-600 truncate"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className={`p-2 rounded-lg transition-colors ${copied
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Share Options */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={shareViaWhatsApp}
                                    className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white
                           rounded-xl font-medium hover:bg-green-600 transition-colors"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    WhatsApp
                                </button>
                                <button
                                    onClick={shareViaSMS}
                                    className="flex items-center justify-center gap-2 py-3 bg-blue-500 text-white
                           rounded-xl font-medium hover:bg-blue-600 transition-colors"
                                >
                                    <MessageCircle className="h-5 w-5" />
                                    SMS
                                </button>
                                <button
                                    onClick={shareViaEmail}
                                    className="flex items-center justify-center gap-2 py-3 bg-gray-600 text-white
                           rounded-xl font-medium hover:bg-gray-700 transition-colors"
                                >
                                    <Mail className="h-5 w-5" />
                                    Email
                                </button>
                                {typeof navigator.share === 'function' && (
                                    <button
                                        onClick={shareNative}
                                        className="flex items-center justify-center gap-2 py-3 bg-purple-500 text-white
                             rounded-xl font-medium hover:bg-purple-600 transition-colors"
                                    >
                                        <Users className="h-5 w-5" />
                                        More
                                    </button>
                                )}
                            </div>

                            {/* Expiry Info */}
                            <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                Link expires in 24 hours
                            </p>
                        </>
                    )}

                    {/* Safety Note */}
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                        <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                        <p className="text-xs text-blue-700">
                            Anyone with this link can see your trip details and real-time location during
                            the ride. Only share with people you trust.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
