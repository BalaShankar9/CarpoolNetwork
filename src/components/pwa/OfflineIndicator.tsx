import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import pwaService from '@/services/pwaService';

export function OfflineIndicator() {
    const [isOnline, setIsOnline] = useState(pwaService.isOnline());
    const [showBanner, setShowBanner] = useState(false);
    const [syncedData, setSyncedData] = useState<any>(null);

    useEffect(() => {
        const cleanupOnline = pwaService.onOnlineChange((online) => {
            setIsOnline(online);
            setShowBanner(true);

            // Auto-hide banner after 5 seconds when back online
            if (online) {
                setTimeout(() => setShowBanner(false), 5000);
            }
        });

        const cleanupSynced = pwaService.onSynced((data) => {
            setSyncedData(data);
            setTimeout(() => setSyncedData(null), 3000);
        });

        // Show banner initially if offline
        if (!pwaService.isOnline()) {
            setShowBanner(true);
        }

        return () => {
            cleanupOnline();
            cleanupSynced();
        };
    }, []);

    return (
        <>
            {/* Offline Banner */}
            <AnimatePresence>
                {showBanner && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-0 left-0 right-0 z-50 ${isOnline
                                ? 'bg-emerald-500'
                                : 'bg-amber-500'
                            }`}
                    >
                        <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
                            {isOnline ? (
                                <>
                                    <Wifi className="w-4 h-4 text-white" />
                                    <span className="text-sm font-medium text-white">
                                        You're back online! Syncing your data...
                                    </span>
                                    <RefreshCw className="w-4 h-4 text-white animate-spin" />
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-4 h-4 text-white" />
                                    <span className="text-sm font-medium text-white">
                                        You're offline. Changes will sync when connected.
                                    </span>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Synced Action Toast */}
            <AnimatePresence>
                {syncedData && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50"
                    >
                        <div className="bg-slate-800 rounded-xl shadow-lg border border-slate-700 p-4 flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                <RefreshCw className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">Action synced!</p>
                                <p className="text-xs text-slate-400">Your offline action was saved</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Persistent Offline Icon in Header */}
            {!isOnline && (
                <div className="fixed top-4 right-4 z-40">
                    <div className="bg-amber-500 text-white p-2 rounded-full shadow-lg">
                        <CloudOff className="w-4 h-4" />
                    </div>
                </div>
            )}
        </>
    );
}

export default OfflineIndicator;
