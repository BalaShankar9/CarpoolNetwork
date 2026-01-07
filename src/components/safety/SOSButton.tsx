import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Phone,
    MapPin,
    Shield,
    X,
    Loader2,
    CheckCircle,
    Share2,
} from 'lucide-react';
import { emergencyService } from '@/services/emergencyService';

interface SOSButtonProps {
    rideId?: string;
    userId: string;
    onAlert?: () => void;
}

export function SOSButton({ rideId, userId, onAlert }: SOSButtonProps) {
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [isTriggering, setIsTriggering] = useState(false);
    const [alertSent, setAlertSent] = useState(false);
    const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

    const HOLD_DURATION = 3000; // 3 seconds to trigger

    // Get current location
    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setCurrentLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    });
                },
                (error) => console.error('Geolocation error:', error),
                { enableHighAccuracy: true }
            );

            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Handle hold progress
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isHolding && !showConfirmation) {
            interval = setInterval(() => {
                setHoldProgress((prev) => {
                    const newProgress = prev + 100 / (HOLD_DURATION / 100);
                    if (newProgress >= 100) {
                        setShowConfirmation(true);
                        setIsHolding(false);
                        return 100;
                    }
                    return newProgress;
                });
            }, 100);
        } else if (!isHolding) {
            setHoldProgress(0);
        }

        return () => clearInterval(interval);
    }, [isHolding, showConfirmation]);

    const handleTriggerSOS = useCallback(async () => {
        if (!currentLocation) {
            alert('Unable to get your location. Please enable GPS.');
            return;
        }

        if (!rideId) {
            alert('No active ride to report. Emergency services have been notified of your location.');
        }

        setIsTriggering(true);
        try {
            await emergencyService.triggerSOS(rideId || 'emergency', userId, currentLocation);
            setAlertSent(true);
            onAlert?.();

            // Reset after 5 seconds
            setTimeout(() => {
                setAlertSent(false);
                setShowConfirmation(false);
            }, 5000);
        } catch (error) {
            console.error('Failed to trigger SOS:', error);
            alert('Failed to send SOS. Please call emergency services directly.');
        } finally {
            setIsTriggering(false);
        }
    }, [rideId, userId, currentLocation, onAlert]);

    const handleCancel = () => {
        setShowConfirmation(false);
        setHoldProgress(0);
    };

    return (
        <>
            {/* SOS Button */}
            <motion.button
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                onTouchStart={() => setIsHolding(true)}
                onTouchEnd={() => setIsHolding(false)}
                className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/30 flex items-center justify-center overflow-hidden"
                whileTap={{ scale: 0.95 }}
                animate={{
                    boxShadow: isHolding
                        ? '0 0 30px rgba(239, 68, 68, 0.8)'
                        : '0 10px 25px rgba(239, 68, 68, 0.3)',
                }}
            >
                {/* Progress Ring */}
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                        cx="40"
                        cy="40"
                        r="38"
                        fill="none"
                        stroke="rgba(255,255,255,0.3)"
                        strokeWidth="4"
                    />
                    <motion.circle
                        cx="40"
                        cy="40"
                        r="38"
                        fill="none"
                        stroke="white"
                        strokeWidth="4"
                        strokeDasharray={238.76}
                        strokeDashoffset={238.76 * (1 - holdProgress / 100)}
                        strokeLinecap="round"
                    />
                </svg>

                <div className="relative z-10 flex flex-col items-center">
                    <AlertTriangle className="w-8 h-8 text-white" />
                    <span className="text-xs font-bold text-white mt-0.5">SOS</span>
                </div>

                {/* Ripple Effect when holding */}
                <AnimatePresence>
                    {isHolding && (
                        <motion.div
                            className="absolute inset-0 bg-white/20 rounded-full"
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 1, repeat: Infinity }}
                        />
                    )}
                </AnimatePresence>
            </motion.button>

            <p className="text-xs text-slate-400 mt-2 text-center">
                Hold for 3 seconds
            </p>

            {/* Confirmation Modal */}
            <AnimatePresence>
                {showConfirmation && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-slate-800 rounded-2xl max-w-sm w-full overflow-hidden"
                        >
                            {alertSent ? (
                                // Success State
                                <div className="p-6 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="w-20 h-20 mx-auto bg-emerald-500/20 rounded-full flex items-center justify-center mb-4"
                                    >
                                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                                    </motion.div>
                                    <h3 className="text-xl font-bold text-white mb-2">
                                        Alert Sent
                                    </h3>
                                    <p className="text-slate-400">
                                        Your emergency contacts and our safety team have been notified.
                                        Help is on the way.
                                    </p>

                                    {currentLocation && (
                                        <div className="mt-4 p-3 bg-slate-700/50 rounded-lg flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-red-400" />
                                            <span className="text-sm text-slate-300">
                                                Location shared: {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // Confirmation State
                                <>
                                    <div className="p-6 bg-red-500/10 border-b border-red-500/20">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                                                <AlertTriangle className="w-6 h-6 text-red-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-white">
                                                    Trigger Emergency Alert?
                                                </h3>
                                                <p className="text-sm text-slate-400">
                                                    This will notify your emergency contacts
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                                            <Phone className="w-5 h-5 text-emerald-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">
                                                    Emergency Services
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Call 999 (UK) or local emergency number
                                                </p>
                                            </div>
                                            <a
                                                href="tel:999"
                                                className="px-3 py-1.5 bg-emerald-500 text-white text-sm font-medium rounded-lg"
                                            >
                                                Call
                                            </a>
                                        </div>

                                        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                                            <Share2 className="w-5 h-5 text-purple-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">
                                                    Share Location
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Your location will be shared with contacts
                                                </p>
                                            </div>
                                            {currentLocation && (
                                                <span className="text-xs text-emerald-400">Ready</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                                            <Shield className="w-5 h-5 text-blue-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-white">
                                                    Safety Team Alert
                                                </p>
                                                <p className="text-xs text-slate-400">
                                                    Our team will be notified immediately
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 border-t border-slate-700 flex gap-3">
                                        <button
                                            onClick={handleCancel}
                                            className="flex-1 py-3 bg-slate-700 text-white font-medium rounded-lg hover:bg-slate-600 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleTriggerSOS}
                                            disabled={isTriggering}
                                            className="flex-1 py-3 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isTriggering ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Sending...
                                                </>
                                            ) : (
                                                'Send Alert'
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

// Compact SOS button for header/nav
export function CompactSOSButton({ rideId, userId }: { rideId: string; userId: string }) {
    const [showFullButton, setShowFullButton] = useState(false);

    return (
        <>
            <motion.button
                onClick={() => setShowFullButton(true)}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                whileTap={{ scale: 0.95 }}
            >
                <AlertTriangle className="w-5 h-5 text-red-400" />
            </motion.button>

            <AnimatePresence>
                {showFullButton && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setShowFullButton(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-800 rounded-2xl p-6 flex flex-col items-center"
                        >
                            <button
                                onClick={() => setShowFullButton(false)}
                                className="absolute top-4 right-4 p-2 hover:bg-slate-700 rounded-lg"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>

                            <h3 className="text-lg font-bold text-white mb-4">Emergency SOS</h3>
                            <SOSButton rideId={rideId} userId={userId} onAlert={() => setShowFullButton(false)} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default SOSButton;
