import { useState, useEffect, useCallback } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    MapPin,
    Shield,
    Phone,
    X,
} from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import { useAuth } from '../../contexts/AuthContext';
import { createSafetyCheckIn, triggerSOS } from '../../services/safetyService';

interface SafetyCheckInProps {
    rideId: string;
    isDriver?: boolean;
    checkInInterval?: number; // minutes
    onSOSTriggered?: () => void;
}

type CheckInStatus = 'pending' | 'ok' | 'help_needed' | 'no_response';

export function SafetyCheckIn({
    rideId,
    isDriver = false,
    checkInInterval = 30,
    onSOSTriggered,
}: SafetyCheckInProps) {
    const { user } = useAuth();
    const [showCheckIn, setShowCheckIn] = useState(false);
    const [status, setStatus] = useState<CheckInStatus>('pending');
    const [nextCheckIn, setNextCheckIn] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(60); // 60 second window to respond
    const [submitting, setSubmitting] = useState(false);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
        null
    );

    // Get current location
    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                error => {
                    console.warn('Location access denied:', error);
                },
                { enableHighAccuracy: true }
            );
        }
    }, []);

    // Schedule check-ins
    useEffect(() => {
        const scheduleNextCheckIn = () => {
            const next = new Date();
            next.setMinutes(next.getMinutes() + checkInInterval);
            setNextCheckIn(next);
        };

        scheduleNextCheckIn();

        const interval = setInterval(() => {
            setShowCheckIn(true);
            setCountdown(60);
            setStatus('pending');
        }, checkInInterval * 60 * 1000);

        return () => clearInterval(interval);
    }, [checkInInterval]);

    // Countdown timer when check-in is shown
    useEffect(() => {
        if (!showCheckIn || countdown <= 0) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    // Time's up - auto-escalate
                    handleNoResponse();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showCheckIn, countdown]);

    const handleCheckIn = async (checkInStatus: 'ok' | 'help_needed') => {
        if (!user) return;

        setSubmitting(true);

        try {
            await createSafetyCheckIn(rideId, user.id, checkInStatus, location || undefined);
            setStatus(checkInStatus);
            setShowCheckIn(false);

            if (checkInStatus === 'help_needed') {
                onSOSTriggered?.();
            }

            // Schedule next check-in
            const next = new Date();
            next.setMinutes(next.getMinutes() + checkInInterval);
            setNextCheckIn(next);
        } catch (err) {
            console.error('Failed to submit check-in:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleNoResponse = useCallback(async () => {
        if (!user) return;

        setStatus('no_response');
        setShowCheckIn(false);

        // Trigger SOS due to no response
        try {
            await triggerSOS(user.id, rideId, location || undefined);
            onSOSTriggered?.();
        } catch (err) {
            console.error('Failed to trigger SOS:', err);
        }
    }, [user, rideId, location, onSOSTriggered]);

    const [showSOSConfirm, setShowSOSConfirm] = useState(false);

    const handleSOSButton = async () => {
        if (!user) return;
        setShowSOSConfirm(true);
    };

    const confirmSOS = async () => {
        setShowSOSConfirm(false);
        setSubmitting(true);
        try {
            await triggerSOS(user!.id, rideId, location || undefined);
            onSOSTriggered?.();
            // Show success toast instead of alert
        } catch (err) {
            console.error('Failed to trigger SOS:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Check-in prompt overlay
    if (showCheckIn) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-pulse-slow">
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Shield className="h-8 w-8 text-blue-600" />
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">Safety Check-In</h2>
                        <p className="text-gray-600 mb-4">
                            Are you safe? Please confirm within {countdown} seconds.
                        </p>

                        {/* Countdown bar */}
                        <div className="w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
                            <div
                                className="h-full bg-blue-600 transition-all duration-1000"
                                style={{ width: `${(countdown / 60) * 100}%` }}
                            />
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={() => handleCheckIn('ok')}
                                disabled={submitting}
                                className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold
                         hover:bg-green-600 disabled:opacity-50 transition-colors
                         flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="h-6 w-6" />
                                I'm Safe
                            </button>

                            <button
                                onClick={() => handleCheckIn('help_needed')}
                                disabled={submitting}
                                className="w-full py-4 bg-red-500 text-white rounded-xl font-semibold
                         hover:bg-red-600 disabled:opacity-50 transition-colors
                         flex items-center justify-center gap-2"
                            >
                                <AlertTriangle className="h-6 w-6" />
                                I Need Help
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-4">
                            If you don't respond, we'll notify your emergency contacts
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Inline SOS button and status
    return (
        <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <Shield className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-medium text-gray-900">Safety Center</h3>
                        <p className="text-sm text-gray-500">
                            {status === 'ok'
                                ? 'Last check-in: Safe'
                                : status === 'no_response'
                                    ? 'Alert sent - no response'
                                    : 'Emergency help available'}
                        </p>
                    </div>
                </div>

                {/* Status indicator */}
                {status !== 'pending' && (
                    <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${status === 'ok'
                            ? 'bg-green-100 text-green-700'
                            : status === 'help_needed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                    >
                        {status === 'ok' ? 'Safe' : status === 'help_needed' ? 'Help Sent' : 'Alert'}
                    </div>
                )}
            </div>

            {/* Next check-in timer */}
            {nextCheckIn && (
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                    <Clock className="h-4 w-4" />
                    <span>Next check-in: {nextCheckIn.toLocaleTimeString()}</span>
                </div>
            )}

            {/* SOS Button */}
            <button
                onClick={handleSOSButton}
                disabled={submitting}
                className="w-full py-4 bg-red-600 text-white rounded-xl font-bold
                 hover:bg-red-700 disabled:opacity-50 transition-colors
                 flex items-center justify-center gap-2"
            >
                <AlertTriangle className="h-6 w-6" />
                SOS - Emergency Help
            </button>

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-3 mt-3">
                <a
                    href="tel:999"
                    className="flex items-center justify-center gap-2 py-2 bg-gray-100
                   text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                    <Phone className="h-4 w-4" />
                    Call 999
                </a>
                <button
                    onClick={() => {
                        if (location) {
                            window.open(
                                `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
                                '_blank'
                            );
                        }
                    }}
                    disabled={!location}
                    className="flex items-center justify-center gap-2 py-2 bg-gray-100
                   text-gray-700 rounded-lg font-medium hover:bg-gray-200
                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <MapPin className="h-4 w-4" />
                    My Location
                </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-3">
                {isDriver ? 'As a driver' : 'As a passenger'}, your safety is our priority
            </p>

            {/* SOS Confirmation Modal */}
            <ConfirmModal
                isOpen={showSOSConfirm}
                onClose={() => setShowSOSConfirm(false)}
                onConfirm={confirmSOS}
                title="Send Emergency Alert"
                message="This will alert your emergency contacts and our safety team with your current location. Are you sure you want to continue?"
                confirmText="Send Alert"
                cancelText="Cancel"
                variant="danger"
                loading={submitting}
            />
        </div>
    );
}
