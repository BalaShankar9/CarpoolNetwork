import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import pwaService from '@/services/pwaService';

export function UpdatePrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        const cleanup = pwaService.onUpdateAvailable(() => {
            setShowPrompt(true);
        });

        // Check if update is already available
        if (pwaService.hasUpdate()) {
            setShowPrompt(true);
        }

        return cleanup;
    }, []);

    const handleUpdate = async () => {
        setUpdating(true);
        await pwaService.applyUpdate();
        // Page will reload automatically
    };

    const handleDismiss = () => {
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -100 }}
                className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto md:max-w-md z-50"
            >
                <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>

                        <div className="flex-1">
                            <h3 className="font-bold text-white">Update Available!</h3>
                            <p className="text-sm text-emerald-100">
                                A new version is ready with improvements
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDismiss}
                                className="p-2 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <button
                                onClick={handleUpdate}
                                disabled={updating}
                                className="px-4 py-2 bg-white text-emerald-600 rounded-xl font-medium hover:bg-emerald-50 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {updating ? (
                                    <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Update
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default UpdatePrompt;
