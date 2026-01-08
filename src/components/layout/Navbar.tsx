import { Menu, X, MessageSquare, Settings, Shield } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRealtime } from '../../contexts/RealtimeContext';
import Logo from '../shared/Logo';
import { NotificationsBell } from '../notifications/NotificationsBell';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import ClickableUserProfile from '../shared/ClickableUserProfile';
import { useNavigate, Link } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, profile, signOut, isAdmin } = useAuth();
  useRealtime();
  const navigate = useNavigate();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Logo />

          <div className="hidden md:flex items-center gap-8">
            <Link to="/find-rides" className="text-gray-700 hover:text-blue-600 transition-colors">
              Find a Ride
            </Link>
            <Link to="/post-ride" className="text-gray-700 hover:text-blue-600 transition-colors">
              Offer a Ride
            </Link>
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              How It Works
            </button>
            <Link to="/safety" className="text-gray-700 hover:text-blue-600 transition-colors">
              Safety
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                <div className="relative">
                  <NotificationsBell onClick={() => setNotificationsOpen(!notificationsOpen)} />
                  <NotificationsPanel
                    isOpen={notificationsOpen}
                    onClose={() => setNotificationsOpen(false)}
                  />
                </div>
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
                <div className="pl-3 border-l border-gray-300">
                  {profile && (
                    <ClickableUserProfile
                      user={{
                        id: user.id,
                        full_name: profile.full_name,
                        avatar_url: profile.avatar_url,
                        profile_photo_url: profile.profile_photo_url
                      }}
                      size="sm"
                      showNameRight
                      additionalInfo={`⭐ ${profile.average_rating?.toFixed(1) || '0.0'}`}
                      rating={profile.average_rating}
                    />
                  )}
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
                <Link
                  to="/signin"
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Get Started
                </Link>
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
            <Link
              to="/find-rides"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Find a Ride
            </Link>
            <Link
              to="/post-ride"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Offer a Ride
            </Link>
            <button
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              How It Works
            </button>
            <Link
              to="/safety"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              Safety
            </Link>
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
                <Link
                  to="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
