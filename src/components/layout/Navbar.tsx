import { User, Menu, X, MessageSquare, Settings, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import Logo from '../shared/Logo';
import NotificationCenter from '../shared/NotificationCenter';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  const { unreadNotifications } = useRealtime();
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo />

          <div className="hidden md:flex items-center gap-8">
            <a href="#find-ride" className="text-gray-700 hover:text-blue-600 transition-colors">
              Find a Ride
            </a>
            <a href="#offer-ride" className="text-gray-700 hover:text-blue-600 transition-colors">
              Offer a Ride
            </a>
            <a href="#how-it-works" className="text-gray-700 hover:text-blue-600 transition-colors">
              How It Works
            </a>
            <a href="#safety" className="text-gray-700 hover:text-blue-600 transition-colors">
              Safety
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <NotificationCenter />
                <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors relative" title="Messages">
                  <MessageSquare className="w-6 h-6" />
                </button>
                <button
                  onClick={() => navigate('/settings')}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors relative"
                  title="Settings"
                >
                  <Settings className="w-6 h-6" />
                </button>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin/diagnostics')}
                    className="p-2 text-gray-600 hover:text-purple-600 transition-colors relative"
                    title="Admin Panel"
                  >
                    <Shield className="w-6 h-6" />
                  </button>
                )}
                <div className="flex items-center gap-3 pl-3 border-l border-gray-300">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {profile?.total_rides_offered || 0} rides offered
                    </p>
                  </div>
                  <button className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-lg hover:bg-blue-700 transition-colors">
                    {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                  </button>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await signOut();
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.replace('/signin');
                    } catch (err) {
                      console.error('Unexpected logout error:', err);
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.replace('/signin');
                    }
                  }}
                  className="text-gray-600 hover:text-red-600 transition-colors text-sm"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <a
                  href="#signin"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  Sign In
                </a>
                <a
                  href="#signup"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Get Started
                </a>
              </>
            )}
          </div>

          <button
            className="md:hidden text-gray-700"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-4 space-y-3">
            <a
              href="#find-ride"
              className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Find a Ride
            </a>
            <a
              href="#offer-ride"
              className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Offer a Ride
            </a>
            <a
              href="#how-it-works"
              className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              How It Works
            </a>
            <a
              href="#safety"
              className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Safety
            </a>
            {user ? (
              <>
                {isAdmin && (
                  <button
                    onClick={() => {
                      navigate('/admin/diagnostics');
                      setMobileMenuOpen(false);
                    }}
                    className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 transition-colors flex items-center gap-2"
                  >
                    <Settings className="w-5 h-5" />
                    Admin Panel
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      await signOut();
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.replace('/signin');
                    } catch (err) {
                      console.error('Unexpected logout error:', err);
                      localStorage.clear();
                      sessionStorage.clear();
                      window.location.replace('/signin');
                    }
                  }}
                  className="block w-full text-left py-2 text-red-600 hover:text-red-700 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <a
                  href="#signin"
                  className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </a>
                <a
                  href="#signup"
                  className="block py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
