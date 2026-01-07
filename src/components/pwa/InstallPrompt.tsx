import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Zap, Bell, Wifi } from 'lucide-react';
import pwaService from '@/services/pwaService';

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedAt = new Date(wasDismissed);
      const daysSince = (Date.now() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24);
      // Show again after 7 days
      if (daysSince < 7) {
        setDismissed(true);
        return;
      }
    }

    // Check if already installed
    if (pwaService.isInstalled()) {
      return;
    }

    // Listen for install ready event
    const cleanup = pwaService.onInstallReady(() => {
      // Delay showing prompt for better UX
      setTimeout(() => setShowPrompt(true), 3000);
    });

    // Check if can install immediately
    if (pwaService.canInstall()) {
      setTimeout(() => setShowPrompt(true), 3000);
    }

    return cleanup;
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    const accepted = await pwaService.promptInstall();
    setInstalling(false);
    
    if (accepted) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (dismissed || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
          {/* Header */}
          <div className="p-4 pb-0 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Smartphone className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white">Install CarpoolNetwork</h3>
                <p className="text-sm text-slate-400">Get the full app experience</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Features */}
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-slate-300">Faster loading & instant access</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-slate-300">Push notifications for rides & messages</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Wifi className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-slate-300">Works offline with cached data</span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 pt-0 flex gap-3">
            <button
              onClick={handleDismiss}
              className="flex-1 px-4 py-3 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition-all"
            >
              Not Now
            </button>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {installing ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Install
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default InstallPrompt;
