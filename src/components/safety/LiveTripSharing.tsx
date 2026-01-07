import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Share2,
  MapPin,
  Clock,
  Users,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { emergencyService, LiveTripShare, EmergencyContact } from '@/services/emergencyService';

interface LiveTripSharingProps {
  rideId: string;
  userId: string;
  rideName?: string;
  estimatedArrival?: Date;
}

export function LiveTripSharing({
  rideId,
  userId,
  rideName,
  estimatedArrival,
}: LiveTripSharingProps) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [activeShare, setActiveShare] = useState<LiveTripShare | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [duration, setDuration] = useState(240); // 4 hours default
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId, rideId]);

  const loadData = async () => {
    try {
      const [contactsData, sharesData] = await Promise.all([
        emergencyService.getEmergencyContacts(userId),
        emergencyService.getActiveTripShares(userId),
      ]);
      setContacts(contactsData);
      
      // Find active share for this ride
      const existingShare = sharesData.find((s) => s.rideId === rideId);
      setActiveShare(existingShare || null);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSharing = async () => {
    if (selectedContacts.length === 0) {
      alert('Please select at least one contact to share with');
      return;
    }

    setSharing(true);
    try {
      const share = await emergencyService.startTripShare(
        rideId,
        userId,
        selectedContacts,
        duration
      );
      setActiveShare(share);
    } catch (error) {
      console.error('Failed to start sharing:', error);
      alert('Failed to start trip sharing');
    } finally {
      setSharing(false);
    }
  };

  const handleStopSharing = async () => {
    if (!activeShare) return;

    try {
      await emergencyService.endTripShare(activeShare.id);
      setActiveShare(null);
    } catch (error) {
      console.error('Failed to stop sharing:', error);
    }
  };

  const copyShareLink = async () => {
    if (!activeShare) return;
    
    const url = `${window.location.origin}/track/${activeShare.shareCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    if (hours < 1) return `${minutes} minutes`;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Share2 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Live Trip Sharing</h3>
            <p className="text-sm text-slate-400">
              Share your live location with trusted contacts
            </p>
          </div>
        </div>
      </div>

      {activeShare ? (
        // Active Sharing State
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-emerald-400 rounded-full"
              />
              <span className="text-sm text-emerald-400 font-medium">
                Sharing Active
              </span>
            </div>
            <button
              onClick={handleStopSharing}
              className="text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              Stop Sharing
            </button>
          </div>

          {/* Share Code */}
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Share Code</span>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1.5 text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
            <code className="text-lg font-mono text-white tracking-wider">
              {activeShare.shareCode}
            </code>
          </div>

          {/* Sharing Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-xs">Shared With</span>
              </div>
              <span className="text-white font-medium">
                {activeShare.sharedWith.length} contact{activeShare.sharedWith.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center gap-2 text-slate-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs">Expires</span>
              </div>
              <span className="text-white font-medium">
                {new Date(activeShare.expiresAt).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* View Tracking Page */}
          <a
            href={`/track/${activeShare.shareCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-slate-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-slate-600 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Tracking Page
          </a>
        </div>
      ) : (
        // Setup Sharing State
        <div className="p-4 space-y-4">
          {rideName && (
            <div className="p-3 bg-slate-700/30 rounded-lg flex items-center gap-3">
              <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-slate-400">Sharing trip to</p>
                <p className="text-white font-medium">{rideName}</p>
              </div>
            </div>
          )}

          {/* Contact Selection */}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">
              Select contacts to share with
            </p>
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No emergency contacts added yet
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {contacts.map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedContacts.includes(contact.id)
                        ? 'bg-purple-500/20 border border-purple-500/40'
                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {contact.name}
                      </p>
                      <p className="text-xs text-slate-400">{contact.relationship}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Duration Selection */}
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">
              Share duration
            </p>
            <div className="flex gap-2 flex-wrap">
              {[60, 120, 240, 480].map((mins) => (
                <button
                  key={mins}
                  onClick={() => setDuration(mins)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    duration === mins
                      ? 'bg-purple-500 text-white'
                      : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {formatDuration(mins)}
                </button>
              ))}
            </div>
          </div>

          {/* Start Sharing Button */}
          <button
            onClick={handleStartSharing}
            disabled={sharing || selectedContacts.length === 0}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sharing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                Start Sharing
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Trip Tracking Page (for recipients)
interface TripTrackingPageProps {
  shareCode: string;
}

export function TripTrackingPage({ shareCode }: TripTrackingPageProps) {
  const [share, setShare] = useState<LiveTripShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadShare();
    const interval = setInterval(loadShare, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [shareCode]);

  const loadShare = async () => {
    try {
      const data = await emergencyService.getTripShareByCode(shareCode);
      if (!data) {
        setError('This tracking link is invalid or has expired');
      } else {
        setShare(data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to load tracking information');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <EyeOff className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Link Not Found</h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Eye className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-bold text-white">Live Trip Tracking</h1>
              <p className="text-sm text-slate-400">
                {share?.isActive ? 'Trip in progress' : 'Trip ended'}
              </p>
            </div>
          </div>

          <div className="p-4">
            {/* Map placeholder */}
            <div className="aspect-video bg-slate-700/50 rounded-lg mb-4 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-slate-600" />
            </div>

            {share?.lastLocationUpdate && (
              <p className="text-xs text-slate-400 text-center">
                Last updated: {new Date(share.lastLocationUpdate).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LiveTripSharing;
