import { NavLink } from 'react-router-dom';
import { Home, Search, PlusCircle, Calendar, MessageSquare, User, LogOut, Users, MessageCircle, LayoutDashboard, UserCheck, Activity, Bug, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../shared/Logo';
import AIChatbot from '../shared/AIChatbot';
import EnvironmentBanner from '../shared/EnvironmentBanner';
import FeedbackButton from '../shared/FeedbackButton';
import ProfilePictureBanner from '../shared/ProfilePictureBanner';
import ProfileCompletionBanner from '../shared/ProfileCompletionBanner';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut, isAdmin } = useAuth();

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
    { to: '/profile', icon: User, label: 'Profile' },
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
      <ProfilePictureBanner />
      <ProfileCompletionBanner />
      <header className="bg-white border-b border-gray-200 sticky z-50 top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Logo size="sm" />

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">⭐ {profile?.average_rating?.toFixed(1) || '0.0'}</p>
              </div>
              <button
                onClick={handleSignOut}
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
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}

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
          <div className="max-w-7xl mx-auto p-6 pb-28 md:pb-6">
            {children}
          </div>
        </main>
      </div>

      <AIChatbot />
      <FeedbackButton />

      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
        <div className="grid grid-cols-7 gap-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
