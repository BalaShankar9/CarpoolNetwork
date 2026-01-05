import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, PlusCircle, Calendar, MessageSquare, User, LogOut, MessageCircle, LayoutDashboard, UserCheck, Activity, Bug, MapPin, Settings, Users, Bell } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../shared/Logo';
import AiAssistantWidget from '../shared/AIChatbot';
import EnvironmentBanner from '../shared/EnvironmentBanner';
import OfflineBanner from '../shared/OfflineBanner';
import FeedbackButton from '../shared/FeedbackButton';
import ProfilePictureBanner from '../shared/ProfilePictureBanner';
import ProfileCompletionBanner from '../shared/ProfileCompletionBanner';
import ToastContainer from '../shared/ToastContainer';
import { NotificationsBell } from '../notifications/NotificationsBell';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { useRealtime } from '../../contexts/RealtimeContext';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { unreadNotifications, unreadMessages } = useRealtime();
  const displayName = profile?.full_name || 'Account';

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/signin');
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/find-rides', icon: Search, label: 'Find Rides' },
    { to: '/post-ride', icon: PlusCircle, label: 'Post Ride' },
    { to: '/request-ride', icon: MapPin, label: 'Request Ride' },
    { to: '/my-rides', icon: Calendar, label: 'My Rides' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/community', icon: Users, label: 'Community' },
    { to: '/profile', icon: User, label: 'Profile' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  const adminItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/diagnostics', icon: Activity, label: 'Diagnostics' },
    { to: '/admin/users', icon: UserCheck, label: 'Users' },
    { to: '/admin/feedback', icon: MessageCircle, label: 'Feedback' },
    { to: '/admin/bugs', icon: Bug, label: 'Bug Reports' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <EnvironmentBanner />
      <OfflineBanner />
      <ProfilePictureBanner />
      <ProfileCompletionBanner />
      <ToastContainer />
      <header className="bg-white border-b border-gray-200 sticky z-50 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="sm" />

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{displayName}</p>
                <p className="text-xs text-gray-500">Rating {profile?.average_rating?.toFixed(1) || '0.0'}</p>
              </div>
              <div className="relative hidden sm:block">
                <NotificationsBell onClick={() => setNotificationsOpen((open) => !open)} />
                <NotificationsPanel
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                />
              </div>
              <button
                onClick={() => navigate('/community')}
                aria-label="Community"
                title="Community"
                className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Users className="w-5 h-5" />
              </button>
              <button
                onClick={handleSignOut}
                aria-label="Sign Out"
                data-testid="sign-out-button"
                className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex">
        <nav className="w-64 bg-white border-r border-gray-200 hidden md:block">
          <div className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`
                }
              >
                <div className="relative">
                  <item.icon className="w-5 h-5" />
                  {item.to === '/messages' && unreadMessages > 0 && (
                    <span
                      data-testid="messages-badge"
                      className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    >
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setNotificationsOpen((open) => !open)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-50 w-full"
              aria-label="Notifications"
            >
              <div className="relative">
                <Bell className="w-5 h-5" />
                {unreadNotifications > 0 && (
                  <span
                    data-testid="notification-badge"
                    className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                  >
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </span>
                )}
              </div>
              <span>Notifications</span>
            </button>

            {isAdmin && (
              <>
                <div className="pt-4 mt-4 border-t border-gray-200">
                  <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Admin</p>
                </div>
                {adminItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </div>
        </nav>

        <main className="flex-1 overflow-y-auto">
          <div
            className="max-w-7xl mx-auto p-6 pb-10"
            style={{ paddingBottom: 'calc(var(--app-bottom-nav-height) + 48px)' }}
          >
            {children}
          </div>
        </main>
      </div>

      <AiAssistantWidget />
      <FeedbackButton />

      <nav
        className="md:hidden bg-white/95 backdrop-blur border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50 shadow-lg"
        style={{ height: 'var(--app-bottom-nav-height)', paddingBottom: 'var(--safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5 h-full">
          {[
            { to: '/', icon: Home, label: 'Home' },
            { to: '/find-rides', icon: Search, label: 'Find' },
            { to: '/post-ride', icon: PlusCircle, label: 'Post' },
            { to: '/messages', icon: MessageSquare, label: 'Messages' },
            { to: '/profile', icon: User, label: 'Profile' },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-11 h-11 flex items-center justify-center rounded-2xl ${
                      isActive ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100' : 'text-gray-600'
                    }`}
                  >
                    <div className="relative">
                      <item.icon className="w-5 h-5" />
                      {item.to === '/messages' && unreadMessages > 0 && (
                        <span
                          data-testid="messages-badge"
                          className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center"
                        >
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setNotificationsOpen((open) => !open)}
            className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-blue-600 transition-colors relative"
            aria-label="Notifications"
          >
            <div className="w-11 h-11 flex items-center justify-center rounded-2xl text-gray-600">
              <Bell className="w-5 h-5" />
            </div>
            <span className="text-xs font-medium">Alerts</span>
            {unreadNotifications > 0 && (
              <span
                data-testid="notification-badge"
                className="absolute top-1 right-5 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
              >
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}




