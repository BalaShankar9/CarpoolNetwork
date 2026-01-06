import { useState } from 'react';
import { AlertTriangle, Phone, MapPin, X, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';

interface SOSButtonProps {
  rideId?: string;
  location?: { lat: number; lng: number };
  compact?: boolean;
}

export default function SOSButton({ rideId, location, compact = false }: SOSButtonProps) {
  const { profile } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [activating, setActivating] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const activateSOS = async () => {
    try {
      setActivating(true);

      const emergencyData = {
        user_id: profile?.id,
        ride_id: rideId,
        location: location ? `POINT(${location.lng} ${location.lat})` : null,
        status: 'active',
        triggered_at: new Date().toISOString()
      };

      const { data: emergency, error: emergencyError } = await supabase
        .from('emergency_alerts')
        .insert(emergencyData)
        .select()
        .single();

      if (emergencyError) throw emergencyError;

      const { data: contacts, error: contactsError } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', profile?.id);

      if (contactsError) throw contactsError;

      if (contacts && contacts.length > 0) {
        const notifications = contacts.map(contact => ({
          emergency_alert_id: emergency.id,
          contact_id: contact.id,
          notification_sent: false
        }));

        await supabase
          .from('emergency_notifications')
          .insert(notifications);
      }

      setSosActive(true);
      setShowConfirm(false);

      toast.warning('Emergency alert activated! Your emergency contacts will be notified.', 10000);
    } catch (err: any) {
      console.error('Error activating SOS:', err);
      toast.error('Failed to activate emergency alert. Please call emergency services directly.');
    } finally {
      setActivating(false);
    }
  };

  const deactivateSOS = async () => {
    try {
      await supabase
        .from('emergency_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('user_id', profile?.id)
        .eq('status', 'active');

      setSosActive(false);
      toast.info('Emergency alert deactivated.');
    } catch (err: any) {
      console.error('Error deactivating SOS:', err);
    }
  };

  const handleSOSClick = () => {
    if (sosActive) {
      if (confirm('Are you sure you want to deactivate the emergency alert?')) {
        deactivateSOS();
      }
    } else {
      setShowConfirm(true);
      let count = 5;
      setCountdown(count);

      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count === 0) {
          clearInterval(timer);
        }
      }, 1000);
    }
  };

  if (compact) {
    return (
      <>
        <button
          onClick={handleSOSClick}
          className={`p-3 rounded-full shadow-lg transition-all ${
            sosActive
              ? 'bg-red-600 hover:bg-red-700 animate-pulse'
              : 'bg-red-500 hover:bg-red-600'
          }`}
          title="Emergency SOS"
        >
          <AlertTriangle className="w-5 h-5 text-white" />
        </button>

        {showConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Emergency SOS</h3>
              </div>

              <p className="text-gray-700 mb-4">
                This will immediately alert your emergency contacts with your current location.
              </p>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4 text-sm text-amber-800">
                <strong>For immediate danger, call emergency services (999/112)</strong>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setCountdown(5);
                  }}
                  disabled={activating}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={activateSOS}
                  disabled={activating || countdown > 0}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 flex items-center justify-center gap-2"
                >
                  {activating ? (
                    'Activating...'
                  ) : countdown > 0 ? (
                    <><Clock className="w-4 h-4" /> {countdown}s</>
                  ) : (
                    'Activate SOS'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleSOSClick}
        className={`w-full px-6 py-4 rounded-xl shadow-lg transition-all font-bold text-lg flex items-center justify-center gap-3 ${
          sosActive
            ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        <AlertTriangle className="w-6 h-6" />
        {sosActive ? 'SOS ACTIVE - Tap to Deactivate' : 'Emergency SOS'}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Emergency SOS</h3>
            </div>

            <p className="text-gray-700 mb-4 leading-relaxed">
              Activating SOS will immediately alert your emergency contacts with:
            </p>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <MapPin className="w-4 h-4 text-red-600" />
                <span>Your current location</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-4 h-4 text-red-600" />
                <span>Ride details and driver/passenger information</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Clock className="w-4 h-4 text-red-600" />
                <span>Time of alert activation</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-6">
              <p className="text-sm text-amber-900 font-semibold mb-1">
                For immediate danger:
              </p>
              <p className="text-sm text-amber-800">
                Call emergency services (999 or 112) immediately
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setCountdown(5);
                }}
                disabled={activating}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={activateSOS}
                disabled={activating || countdown > 0}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 font-bold flex items-center justify-center gap-2"
              >
                {activating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Activating...
                  </>
                ) : countdown > 0 ? (
                  <>
                    <Clock className="w-5 h-5" />
                    Wait {countdown}s
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5" />
                    Activate SOS
                  </>
                )}
              </button>
            </div>

            {countdown > 0 && (
              <p className="text-xs text-center text-gray-500 mt-3">
                Please wait {countdown} seconds before activating
              </p>
            )}
          </div>
        </div>
      )}

      {sosActive && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-[60] animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-bold">Emergency SOS Active</span>
          </div>
        </div>
      )}
    </>
  );
}
